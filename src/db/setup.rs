use sqlx::Row;
use sqlx::PgPool;

/// Gets current database scheme version from database.
/// If no scheme exists returns None
/// If scheme exists returns Some(version)
/// If an error occurs returns the [sqlx::Error]
///
/// Notice: This function does not check if the database is set up correctly, it only checks if the schema_changes table exists.
/// If the schema_changes table exists but is empty, this function will produce an sqlx Error.
pub async fn get_current_db_scheme_version(db_pool: &PgPool) -> Result<Option<i32>, sqlx::Error> {
    //Check if schema_changes table exists:
    let res = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_changes') as exists")
        .fetch_one(db_pool)
        .await?;
    let exists : bool = res.try_get("exists")?;
    if !exists{
        return Ok(None);
    }

    let res = sqlx::query("SELECT version FROM schema_changes ORDER BY rollout DESC LIMIT 1")
        .fetch_one(db_pool)
        .await;

    match res{
        Ok(row) => {
            let version : i32 = row.try_get("version")?;
            Ok(Some(version))
        },
        Err(e) => {
            eprintln!("Error while getting current database scheme version: {}", e);
            Err(e)
        }
    }
}

/// Sets the database scheme version to the given version.
pub async fn set_db_scheme_version(db_pool: &PgPool, version: i32) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO schema_changes (version) VALUES ($1)").bind(version)
        .execute(db_pool)
        .await?;
    Ok(())
}


/// Set up the database
pub async fn setup_database(db_pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query_file!("sql_queries/create_users.sql").execute(db_pool).await?;
    sqlx::query_file!("sql_queries/create_login_attempts.sql").execute(db_pool).await?;
    sqlx::query_file!("sql_queries/create_templates.sql").execute(db_pool).await?;
    sqlx::query_file!("sql_queries/create_projects.sql").execute(db_pool).await?;
    sqlx::query_file!("sql_queries/create_projects_users.sql").execute(db_pool).await?;
    sqlx::query_file!("sql_queries/create_schema_changes.sql").execute(db_pool).await?;
    set_db_scheme_version(db_pool, 1).await?;
    Ok(())
}