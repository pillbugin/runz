use once_cell::sync::OnceCell;
use std::sync::mpsc::Sender;
use std::sync::Mutex;

static EMITTER: OnceCell<Mutex<Sender<(String, serde_json::Value)>>> = OnceCell::new();

pub fn set_emitter(sender: &Sender<(String, serde_json::Value)>) {
    let _ = EMITTER.set(Mutex::new(sender.clone()));
}

pub fn emit(event: String, data: serde_json::Value) {
    if let Some(lock) = EMITTER.get() {
        let _ = lock.lock().unwrap().send((event, data));
    }
}
