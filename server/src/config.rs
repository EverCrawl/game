use anyhow::Result;
use serde::Deserialize;

#[derive(Clone, Default, Debug, Deserialize)]
pub struct Server {
    pub address: String,
}

#[derive(Clone, Default, Debug, Deserialize)]
pub struct Database {
    pub user: String,
    pub secret: String,
    pub host: String,
    pub port: usize,
    pub name: String,
}

#[derive(Clone, Default, Debug, Deserialize)]
pub struct Config {
    pub server: Server,
    pub database: Database,
}

impl Config {
    pub fn load(path: &str) -> Result<Config> { Ok(toml::from_str(&std::fs::read_to_string(path)?)?) }
}
