use std::process::{Command, Stdio};
use std::path::Path;
use path_clean::PathClean;
use std::fs::File;
use std::env;

#[cfg(target_os = "macos")]
pub fn detach_background(tempdir: &Path) -> anyhow::Result<()> {
    let mut args: Vec<String> = env::args().collect();
    args.push("--child".to_string());

    Command::new(&args[0])
        .args(&args[1..])
        .stdin(Stdio::null())
        .stdout(File::create(Path::new(&tempdir).join("out.log").clean())?)
        .stderr(File::create(Path::new(&tempdir).join("err.log").clean())?)
        .spawn()?; // Don't setsid() on macOS, maintains the graphical context

    std::process::exit(0);
}

#[cfg(all(unix, not(target_os = "macos")))]
pub fn detach_background(tempdir: &Path) -> anyhow::Result<()> {
    use std::os::unix::process::CommandExt;

    let mut args: Vec<String> = env::args().collect();
    args.push("--child".to_string());

    Command::new(&args[0])
        .args(&args[1..])
        .stdin(Stdio::null())
        .stdout(File::create(Path::new(&tempdir).join("out.log").clean())?)
        .stderr(File::create(Path::new(&tempdir).join("err.log").clean())?)
        .before_exec(|| {
            unsafe {
                libc::setsid();
            }
            Ok(())
        })
        .spawn()?;

    std::process::exit(0);
}
