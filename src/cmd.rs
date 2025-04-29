use crate::pty_manager::{resize_pty, spawn_pty, stop_pty, write_input};

pub fn open_link(uri: String) -> Result<(), String> {
    println!("Opening link: {}", uri);

    match open::that(uri.trim().trim_matches('"').trim_matches('\'')) {
        Ok(_) => Ok(()),
        Err(e) => {
            rfd::MessageDialog::new()
                .set_title(format!("Failed to open link"))
                .set_description(e.to_string())
                .set_buttons(rfd::MessageButtons::Ok)
                .show();

            Ok(())
        }
    }
}

pub fn start_terminal(id: String) -> Result<(), String> {
    let config = crate::config::get_config().unwrap();
    let service = config.services.iter().find(|s| s.id == id).unwrap();

    spawn_pty(&service)
}

pub fn stop_terminal(id: String) -> Result<(), String> {
    stop_pty(&id)
}

pub fn input_terminal(id: String, data: String) -> Result<(), String> {
    write_input(&id, &data)
}

pub fn resize_terminal(id: String, cols: u16, rows: u16) -> Result<(), String> {
    resize_pty(&id, cols, rows)
}
