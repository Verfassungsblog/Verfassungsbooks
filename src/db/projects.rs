use sqlx::PgPool;
use crate::projects::{Project, ProjectOverviewEntry};

/// Add new project to database
///
/// Arguments
/// * `name` - Project name as [`String`]
/// * `description` - Project description as optional [`String`]
/// * `template_id` - Project template id as valid [`uuid::Uuid`]
/// * `db_pool` - Database pool as [`sqlx::PgPool`]
///
/// Returns
/// * `Ok(())` - If project was added successfully
/// * `Err([sqlx::Error])` - If project couldn't be added
///
/// Note: This function does not give any user access to the project, you will need to call [`crate::db::projects::add_project_member`] to give a user access to the project
pub async fn add_project(name: String, description: Option<String>, template_id: uuid::Uuid, db_pool: &PgPool) -> Result<Project, sqlx::Error>{
    match sqlx::query_as::<_, Project>(
        "INSERT INTO projects (name, description, template_id) VALUES ($1, $2, $3) RETURNING *")
        .bind(name)
        .bind(description)
        .bind(template_id)
        .fetch_one(db_pool).await{
        Ok(res) => Ok(res),
        Err(e) => {
            eprintln!("Couldn't add project: {}", e);
            Err(e)
        },
    }
}

/// Gives a user access to a project
///
/// Arguments
/// * `project_id` - Project id as valid [`uuid::Uuid`]
/// * `user_id` - User id as valid [`uuid::Uuid`]
/// * `db_pool` - Database pool as [`sqlx::PgPool`]
///
/// Returns
/// * `Ok(())` - If user was added successfully or user already has access to the project
/// * `Err([sqlx::Error])` - If user couldn't be added
///
/// Note: This function does not check if the user already has access to the project
pub async fn add_project_member(project_id: uuid::Uuid, user_id: uuid::Uuid, db_pool: &PgPool) -> Result<(), sqlx::Error>{
    match sqlx::query!(
        "INSERT INTO projects_users (project_id, user_id) VALUES ($1, $2)",
        project_id, user_id
    ).execute(db_pool).await{
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Couldn't add project member: {}", e);

            // Check if error is unique violation aka user already has access to the project
            return match e {
                sqlx::Error::Database(ref db_error) => {
                    if db_error.kind() == sqlx::error::ErrorKind::UniqueViolation {
                        // User already has access to the project, return Ok
                        Ok(())
                    } else {
                        // Other error, return Err
                        Err(e)
                    }
                },
                _ => {
                    // Other error, return Err
                    Err(e)
                },
            }
        },
    }
}


/// Get project from database
///
/// Arguments
/// * `project_id` - Project id as valid [`uuid::Uuid`]
/// * `db_pool` - Database pool as [`sqlx::PgPool`]
///
/// Returns
/// * `Ok([Project])` - If project was found and has valid data (esp. json)
/// * `Err([sqlx::Error])` - If project couldn't be found or has invalid data
pub async fn get_project(project_id: uuid::Uuid, db_pool: &PgPool) -> Result<Project, sqlx::Error>{
    match sqlx::query_as::<_, Project>(
        "SELECT * FROM projects WHERE project_id = $1")
        .bind(project_id)
        .fetch_one(db_pool).await{
        Ok(res) => Ok(res),
        Err(e) => {
            eprintln!("Couldn't get project: {}", e);
            Err(e)
        },
    }
}


/// Get all projects from database
///
/// Arguments
/// * `limit` - Limit of projects to get as [`i32`]
/// * `offset` - Offset of projects to get as [`i32`]
/// * `db_pool` - Database pool as [`sqlx::PgPool`]
///
/// Returns
/// * `Ok([Vec<ProjectOverviewEntry>])` - If projects were found, but without contents field which is always [`None`] in this function
/// * `Err([sqlx::Error])` - If error occurred
pub async fn get_projects(limit: i32, offset: i32, db_pool: &PgPool) -> Result<Vec<ProjectOverviewEntry>, sqlx::Error>{
    match sqlx::query_as::<_, ProjectOverviewEntry>(
        "SELECT project_id, name, description, last_modified FROM projects ORDER BY last_modified DESC LIMIT $1 OFFSET $2")
        .bind(limit)
        .bind(offset)
        .fetch_all(db_pool).await{
        Ok(res) => Ok(res),
        Err(e) => {
            eprintln!("Couldn't get projects: {}", e);
            Err(e)
        },
    }
}

/// Get number of projects from database
///
/// Arguments
/// * `db_pool` - Database pool as [`sqlx::PgPool`]
///
/// Returns
/// * `Ok([i64])` - Number of projects
/// * `Err([sqlx::Error])` - If error occurred
pub async fn get_projects_count(db_pool: &PgPool) -> Result<i64, sqlx::Error>{
    match sqlx::query!(
        "SELECT COUNT(*) FROM projects")
        .fetch_one(db_pool).await{
        Ok(res) => Ok(res.count.unwrap()),
        Err(e) => {
            eprintln!("Couldn't get projects count: {}", e);
            Err(e)
        },
    }
}