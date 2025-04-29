use anyhow::Ok;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use path_clean::PathClean;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub id: String,
    pub prog: String,
    pub args: Vec<String>,
    pub name: String,
    pub wdir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawServiceConfig {
    pub prog: String,
    pub args: Option<Vec<String>>,
    pub name: Option<String>,
    pub wdir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub name: String,
    pub services: Vec<ServiceConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawConfig {
    pub name: String,
    pub services: Vec<RawServiceConfig>,
}

impl TryFrom<RawConfig> for Config {
    type Error = anyhow::Error;

    fn try_from(raw: RawConfig) -> Result<Self, Self::Error> {
        let mut services = Vec::with_capacity(raw.services.len());

        for (index, raw_service) in raw.services.into_iter().enumerate() {
            if raw_service.prog.trim().is_empty() {
                anyhow::bail!(
                    "Service '{}' has no program defined",
                    raw_service.name.as_deref().unwrap_or("unnamed")
                );
            }

            let wdir = if let Some(raw_wdir) = raw_service.wdir {
                let workdir = Path::new(&raw_wdir);
                let basedir = std::env::current_dir().unwrap();

                let resolved = if workdir.is_absolute() {
                    workdir.to_path_buf()
                } else {
                    basedir.join(workdir)
                };

                resolved.clean().display().to_string()
            } else {
                std::env::current_dir().unwrap().display().to_string()
            };

            let prog = raw_service.prog.clone();
            let service = ServiceConfig {
                wdir,
                id: index.to_string(),
                prog: raw_service.prog,
                args: raw_service.args.unwrap_or(vec!()),
                name: raw_service.name.unwrap_or(prog),
            };

            services.push(service);
        }

        Ok(Config {
            services,
            name: raw.name,
        })
    }
}

// Store in a static to access from anywhere, loaded lazily and once
static CONFIG: OnceCell<Config> = OnceCell::new();

fn get_raw_config_from_argv() -> Option<String> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg == "-r" || arg == "--raw-config" {
            if let Some(raw) = args.next() {
                return Some(raw);
            }
        }
    }
    None
}

fn get_config_path_from_argv() -> Option<PathBuf> {
    let mut args = std::env::args().skip(1);

    while let Some(arg) = args.next() {
        if arg == "-c" || arg == "--config" {
            if let Some(path) = args.next() {
                return Some(PathBuf::from(path));
            }
        }
    }
    None
}

fn get_config_path_from_env() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("RUNZ_CONFIG") {
        return Some(PathBuf::from(path));
    }
    None
}

fn find_config_path() -> Option<PathBuf> {
    if let Some(config_path) = get_config_path_from_argv() {
        println!("Using config path from command argv");
        return Some(config_path);
    }

    if let Some(config_path) = get_config_path_from_env() {
        println!("Using config path from RUNZ_CONFIG environment variable");
        return Some(config_path);
    }

    let default_candidates = vec![
        "runz.yaml",
        "runz.yml",
        "runz.json",
        "runz.jsonc",
        "runz.toml",
    ];

    for file in default_candidates {
        let p = std::env::current_dir().ok()?.join(file);
        if p.exists() {
            println!("Using config file: {}", p.display());
            return Some(p);
        }
    }
    None
}

fn parse_config(config_type: &str, config_data: &str) -> anyhow::Result<Config> {
    let raw_config: RawConfig;
    match config_type {
        "yaml" | "yml" => {
            raw_config = serde_yaml::from_str(&config_data)?;
        }
        "json" | "jsonc" => {
            raw_config = serde_json::from_str(&config_data)?;
        }
        "toml" => {
            raw_config = toml::from_str(&config_data)?;
        }
        _ => {
            anyhow::bail!("Unsupported file format. Expected .yaml, .yml, .json, .jsonc, or .toml")
        }
    }

    if raw_config.services.is_empty() {
        anyhow::bail!("No services defined in config");
    }

    if raw_config.services.len() > 200 {
        anyhow::bail!("Too many services defined in config. Maximum allowed is 200");
    }

    Ok(Config::try_from(raw_config)?)
}

pub fn get_config() -> anyhow::Result<&'static Config> {
    CONFIG.get_or_try_init(|| {
        // Try loading via arguments directly
        if let Some(raw_config_from_argv) = get_raw_config_from_argv() {
            println!("Using inline config from command line argv");
            if let Some((config_type, config_data)) = raw_config_from_argv.split_once('|') {
                return Ok(parse_config(config_type.trim(), config_data.trim().trim_matches('"'))?);
            } else {
                anyhow::bail!("Invalid CLI config input format. Expected <format>|<config_data>");
            }
        }

        // Try finding config file from fs
        if let Some(config_path) = find_config_path() {
            let config_type = config_path
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("toml");

            let config_data = std::fs::read_to_string(&config_path)?;
            return Ok(parse_config(config_type, &config_data)?);
        }

        anyhow::bail!("No config provided and no config file found");
    })
}
