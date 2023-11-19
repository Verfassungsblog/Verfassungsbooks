use config::{Config, ConfigError, Environment, File};
use serde_derive::Deserialize;
use std::env;

/// Stores settings read from config files.
#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct Settings{
    /// Full database connection String
    pub database_string: String,
    /// Full app title shown in navbar
    pub app_title: String,
    /// Maximum number of concurrent database connections
    pub max_db_connections: u32,
}

impl Settings{
    pub fn new() -> Result<Self, ConfigError>{
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let s = Config::builder().add_source(File::with_name("config/default"))
            .add_source( File::with_name(&format!("config/{}", run_mode))
                             .required(false),)
            .add_source(File::with_name("config/local").required(false))
            .add_source(Environment::with_prefix("app"))
            .build()?;

        s.try_deserialize()
    }
}