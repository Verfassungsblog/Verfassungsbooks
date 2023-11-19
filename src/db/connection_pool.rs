use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use crate::settings::Settings;

/// Creates a new database connection pool using the settings provided in configs.
pub async fn create(settings: Settings) -> PgPool{
    PgPoolOptions::new()
        .max_connections(settings.max_db_connections)
        .connect(&settings.database_string)
        .await
        .expect("Failed to create database pool.")
}