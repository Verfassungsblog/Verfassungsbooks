use config::{Config, ConfigError, Environment, File};
use std::env;
use serde::Deserialize;

/// Stores settings read from config files.
#[derive(Debug, Deserialize, Clone)]
#[allow(unused)]
pub struct Settings{
    /// Full app title shown in navbar
    pub app_title: String,
    /// How long should a project be kept in memory after it was last accessed in seconds
    pub project_cache_time: u64,
    /// Where should the app store the data
    pub data_path: String,
    /// How long should the app wait for a file lock in ms
    pub file_lock_timeout: u64,
    pub backup_to_file_interval: u64,
    pub max_rendering_threads : u64,
    pub max_import_threads: u64,
    pub chromium_path: Option<String>
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