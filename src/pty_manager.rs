use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use std::{collections::HashMap, sync::Arc};

use crate::{config::ServiceConfig, emitter};

/// Represents a session containing both the PTY pair and the spawned child process.
pub struct PtySession {
    // The PTY pair used for I/O.
    pub child: PtyPair,
    // The process handle returned when spawning the command on the PTY.
    pub process: Box<dyn Child + Send + Sync>,
    pub is_running: bool,
}

impl PtySession {
    /// Stops the session by killing the child process.
    fn stop(&mut self) {
        if self.is_running {
            // Use the process handle to kill the running process.
            self.process.kill().ok();
            self.is_running = false;
        }
    }
}

/// Global structure to manage multiple PTY sessions.
#[derive(Default)]
pub struct GlobalPty {
    pub sessions: HashMap<String, PtySession>,
}

impl GlobalPty {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

// Store in a static to access from anywhere
lazy_static::lazy_static! {
    pub static ref PTY_MANAGER: Arc<Mutex<GlobalPty>> = Arc::new(Mutex::new(GlobalPty::new()));
}

pub fn spawn_pty(service: &ServiceConfig) -> Result<(), String> {
    let mut manager = PTY_MANAGER.lock();

    if manager.sessions.contains_key(&service.id) {
        // Already exists, so just notify "running"
        emitter::emit(service.id.clone(), serde_json::json!({ "type": "running" }));
        return Ok(());
    }

    let pty_system = native_pty_system();
    let mut builder = CommandBuilder::new(&service.prog);

    builder.env("PWD", &service.wdir);
    builder.cwd(&service.wdir);
    builder.args(&service.args);

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let child = pair
        .slave
        .spawn_command(builder)
        .map_err(|e| format!("spawn error: {e}"))?;

    let session = PtySession {
        child: pair,
        process: child,
        is_running: true,
    };

    // clone reader
    let mut master = session.child.master.try_clone_reader().unwrap();
    let id_clone = service.id.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; 1024];
        loop {
            match master.read(&mut buf) {
                // EOL
                Ok(0) => {
                    emitter::emit(id_clone.clone(), serde_json::json!({ "type": "stopped" }));
                    break;
                }
                Ok(n) => {
                    let output = String::from_utf8_lossy(&buf[..n]).to_string();
                    emitter::emit(
                        id_clone.clone(),
                        serde_json::json!({ "type": "output", "data": output }),
                    );
                }
                Err(e) => {
                    emitter::emit(
                        id_clone.clone(),
                        serde_json::json!({ "type": "error", "data": e.to_string() }),
                    );
                    break;
                }
            }
        }

        let mut manager = PTY_MANAGER.lock();
        if let Some(s) = manager.sessions.get_mut(&id_clone) {
            s.is_running = false;
        }
        manager.sessions.remove(&id_clone);
    });

    // Store the session
    manager.sessions.insert(service.id.clone(), session);

    // Notify the frontend that the session has started
    emitter::emit(service.id.clone(), serde_json::json!({ "type": "running" }));

    Ok(())
}

pub fn write_input(id: &str, data: &str) -> Result<(), String> {
    let manager = PTY_MANAGER.lock();
    if let Some(session) = manager.sessions.get(&id.to_string()) {
        if session.is_running {
            // Get a writer from the master PTY
            let mut writer = session
                .child
                .master
                .take_writer()
                .map_err(|e| format!("failed to get writer: {}", e))?;

            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("write failed: {}", e))?;
        }
        Ok(())
    } else {
        println!("Tryied to write to a non-existent session");
        Ok(())
    }
}

pub fn resize_pty(id: &str, cols: u16, rows: u16) -> Result<(), String> {
    let manager = PTY_MANAGER.lock();
    if let Some(session) = manager.sessions.get(&id.to_string()) {
        session
            .child
            .master
            .resize(PtySize {
                cols,
                rows,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        println!("Tryied to resize a non-existent session");
        Ok(())
    }
}

pub fn stop_pty(id: &str) -> Result<(), String> {
    let mut manager = PTY_MANAGER.lock();
    if let Some(s) = manager.sessions.get_mut(&id.to_string()) {
        s.stop();
    }

    Ok(())
}

pub fn cleanup_all() {
    let mut manager = PTY_MANAGER.lock();
    for (_id, session) in manager.sessions.iter_mut() {
        session.stop();
    }
    // Clear out the map so we don’t hold stale handles.
    manager.sessions.clear();
}
