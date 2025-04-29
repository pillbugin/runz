// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use muda::{Menu, PredefinedMenuItem, Submenu};
use serde::{Deserialize, Serialize};
use serde_json::json;
use path_clean::PathClean;
use slugify::slugify;
use std::sync::mpsc;
use std::env;
use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::{Icon, WindowBuilder},
};
use wry::WebViewBuilder;
use ctrlc;
#[cfg(unix)]
use signal_hook::{consts::SIGTERM, iterator::Signals};
use tiny_http::{Header, Response, Server};
use std::thread;

mod cmd;
mod config;
mod emitter;
mod pty_manager;
#[cfg(unix)]
mod detach;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcMsgData {
    pub name: String,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IpcMsg {
    pub id: String,
    pub event: IpcMsgData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ResizePayload {
    pub rows: u16,
    pub cols: u16,
}

fn load_icon() -> Icon {
    let icon_data = include_bytes!("../assets/icons/icon.png");
    let image = image::load_from_memory(icon_data)
        .expect("Failed to load icon")
        .into_rgba8();
    let (width, height) = image.dimensions();
    let rgba = image.into_raw();
    Icon::from_rgba(rgba, width, height).expect("Failed to create Icon")
}

fn main() -> wry::Result<()> {
    // --- register Ctrl-C on all platforms ---
    ctrlc::set_handler(move || {
        crate::pty_manager::cleanup_all();
        std::process::exit(0);
    }).expect("Error setting Ctrl-C handler");

    // --- on Unix also catch SIGTERM (e.g. `kill`) ---
    #[cfg(unix)]
    {
        let mut signals = Signals::new(&[SIGTERM]).expect("Unable to register SIGTERM handler");
        std::thread::spawn(move || {
            for _ in signals.forever() {
                crate::pty_manager::cleanup_all();
                std::process::exit(0);
            }
        });
    }

    let config = match crate::config::get_config() {
        Ok(config) => config.clone(),
        Err(err) => {
            rfd::MessageDialog::new()
                .set_title("There was an error loading configurations")
                .set_description(err.to_string())
                .set_buttons(rfd::MessageButtons::Ok)
                .show();

            std::process::exit(0);
        }
    };

    let slug = slugify!(&config.name);
    let tempdir = std::env::temp_dir().join(format!("runz/{}", slug)).clean();
    std::fs::create_dir_all(&tempdir)?;
    println!("Logging to directory: {}", tempdir.display());

    let args: Vec<String> = env::args().collect();
    // Se ainda não foi relançado como --child
    if !args.contains(&"--child".to_string()) {
        #[cfg(unix)]
        detach::detach_background(&tempdir).unwrap();
    }

    let quit_item = PredefinedMenuItem::quit(Some("Quit"));
    let separator = PredefinedMenuItem::separator();
    let submenu = Submenu::new("File", true);
    submenu.append_items(&[&separator, &quit_item]).unwrap();
    let menu = Menu::new();
    menu.append_items(&[&submenu]).unwrap();

    #[cfg(target_os = "linux")]
    {
        menu.init_for_gtk_window(&gtk_window, Some(&vertical_gtk_box));
    }
    #[cfg(target_os = "macos")]
    {
        menu.init_for_nsapp();
    }
    #[cfg(target_os = "windows")]
    unsafe {
        menu.init_for_hwnd(window.hwnd() as isize)
    };

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title(config.name.clone())
        .with_inner_size(LogicalSize::new(1024.0, 800.0))
        .with_decorations(false)
        .with_window_icon(Some(load_icon()))
        .build(&event_loop)
        .unwrap();

    // Setup global emitter
    let (tx, rx) = mpsc::channel::<(String, serde_json::Value)>();
    emitter::set_emitter(&tx);

    let init_script = format!(
        "
        window.config = {};
        document.title = window.config.name;
        ",
        serde_json::to_string(&config).unwrap()
    );

    let url = if cfg!(debug_assertions) {
        "http://localhost:5173".to_string()
    } else {
        // Channel to get the selected port
        let (url_tx, url_rx) = mpsc::channel::<String>();

        // Spawn a thread for the tiny_http server
        thread::spawn(move || {
            // Let tiny_http bind to a random open port
            let server = Server::http("127.0.0.1:0").expect("Failed to bind server");

            // Get the address and port
            let addr = server.server_addr();
            let url = format!("http://{}", addr.to_string());
            url_tx.send(url).expect("Failed to send port");

            for request in server.incoming_requests() {
                let response = Response::from_string(include_str!("../frontend/dist/index.html"))
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap());
                let _ = request.respond(response);
            }
        });

        // Wait for the server to tell us the random port
        let url = url_rx.recv().expect("Failed to receive port");
        url
    };

    let webview = WebViewBuilder::new()
        .with_url(url)
        .with_devtools(true)
        .with_initialization_script(init_script)
        .with_ipc_handler(move |message| {
            let msg: IpcMsg = serde_json::from_str(message.body()).unwrap();
            match msg.event.name.as_str() {
                "open_link" => {
                    if let Some(payload) = msg.event.payload {
                        cmd::open_link(payload.to_string()).unwrap();
                    }
                }
                "start_terminal" => {
                    cmd::start_terminal(msg.id).unwrap();
                }
                "stop_terminal" => {
                    cmd::stop_terminal(msg.id).unwrap();
                }
                "input_terminal" => {
                    if let Some(payload) = msg.event.payload {
                        cmd::input_terminal(msg.id, payload.to_string()).unwrap();
                    }
                }
                "resize_terminal" => {
                    if let Some(payload) = msg.event.payload {
                        if let Ok(payload) = serde_json::from_value::<ResizePayload>(payload) {
                            cmd::resize_terminal(msg.id, payload.cols, payload.rows).unwrap();
                        }
                    }
                }
                "close_window" => {
                    emitter::emit("close_window".to_string(), json!({}));
                }
                "minimize_window" => {
                    emitter::emit("minimize_window".to_string(), json!({}));
                }
                "maximize_window" => {
                    emitter::emit("maximize_window".to_string(), json!({}));
                }
                _ => {}
            }
        }).build(&window)?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        // Close requested
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            crate::pty_manager::cleanup_all();
            *control_flow = ControlFlow::Exit;
        }

        // Window focus change
        if let Event::WindowEvent {
            event: WindowEvent::Focused(focused),
            ..
        } = event
        {
            let script = format!(
                "window.dispatchEvent(new CustomEvent('window_focused', {{ detail: {} }}));",
                focused
            );
            webview.evaluate_script(&script).unwrap();
        }

        // Emitter logic
        if let Event::MainEventsCleared = event {
            while let Ok((evt, payload)) = rx.try_recv() {
                if evt == "close_window" {
                    crate::pty_manager::cleanup_all();
                    *control_flow = ControlFlow::Exit
                }
                if evt == "minimize_window" {
                    window.set_minimized(!window.is_minimized());
                }
                if evt == "maximize_window" {
                    window.set_maximized(!window.is_maximized());
                }

                let script = format!(
                    "window.backend.emit('{}', {});",
                    evt,
                    serde_json::to_string(&payload).unwrap()
                );
                webview.evaluate_script(&script).unwrap();
            }
        }
    });
}
