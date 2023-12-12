use crate::projects::{Project, ProjectMetadata, ProjectSettings};
use rocket::http::Status;
use rocket::State;
use sqlx::PgPool;
use crate::session::session_guard::Session;
use rocket::serde::json::Json;

/// # Routes overview
/// * GET /api/projects/{project_id}/
///   Returns a overview of the project
/// * GET /api/projects/{project_id}/settings/
///   Returns all project settings
/// * GET /api/projects/{project_id}/metadata/
///   Returns all project metadata
/// * GET /api/projects/{project_id}/sections/
///   Returns a list of all sections without children
/// * GET /api/projects/{project_id}/sections/{section_id}/
///   Returns a section with all children



/// Return project overview as Json if it exists
/// GET /api/projects/{project_id}/
#[get("/api/projects/<project_id>")]
pub async fn get_project(project_id: String, db_pool: &State<PgPool>, _session: Session) -> Result<Json<Project>, Status> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return Err(Status::NotFound);
        },
    };
    let project = match crate::db::projects::get_project(project_id, db_pool).await {
        Ok(project) => project,
        Err(e) => {
            eprintln!("Couldn't get project: {}", e);
            return Err(Status::NotFound);
        },
    };

    Ok(Json(project))
}

/// Return project settings as Json if it exists
/// GET /api/projects/{project_id}/settings/
#[get("/api/projects/<project_id>/settings")]
pub async fn get_project_settings(project_id: String, db_pool: &State<PgPool>, _session: Session) -> Result<Json<ProjectSettings>, Status> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return Err(Status::NotFound);
        },
    };
    match crate::db::projects::get_project_settings(project_id, db_pool).await {
        Ok(project_settings) => match project_settings{
            Some(project_settings) => Ok(Json(project_settings)),
            None => {
                return Err(Status::NotFound);
            },
        },
        Err(e) => {
            eprintln!("Couldn't get project settings: {}", e);
            return Err(Status::InternalServerError);
        },
    }
}

/// Return project metadata as Json if it exists
/// GET /api/projects/{project_id}/metadata/
#[get("/api/projects/<project_id>/metadata")]
pub async fn get_project_metadata(project_id: String, db_pool: &State<PgPool>, _session: Session) -> Result<Json<ProjectMetadata>, Status> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return Err(Status::NotFound);
        },
    };
    match crate::db::projects::get_project_metadata(project_id, db_pool).await {
        Ok(project_metadata) => match project_metadata{
            Some(project_metadata) => Ok(Json(project_metadata)),
            None => {
                return Err(Status::NotFound);
            },
        },
        Err(e) => {
            eprintln!("Couldn't get project metadata: {}", e);
            return Err(Status::InternalServerError);
        },
    }
}