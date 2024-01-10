use rocket::serde::json::Json;
use std::sync::Arc;
use rocket::State;
use serde_derive::{Deserialize, Serialize};
use crate::data_storage::ProjectStorage;
use crate::projects::{ProjectMetadata, ProjectSettings};
use crate::session::session_guard::Session;
use crate::settings::Settings;

/// Api Endpoints for the project editor

/// GET /api/projects/<project_id>/metadata
///     Returns the metadata of the project
/// GET /api/projects/<project_id>/settings
///     Returns the settings of the project
/// GET /api/projects/<project_id>/contents
///     Returns a list of all contents (sections or toc placeholder) in the project
/// GET /api/projects/<project_id>/sections/<section_id>
///     Returns a section

#[derive(Serialize, Deserialize)]
pub struct ApiResult<T> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

#[derive(Serialize, Deserialize)]
pub enum ApiError{
    NotFound,
    Unauthorized,
    Other(String),
}

impl<T> ApiResult<T>{
    pub fn new_error(error: ApiError) -> Json<ApiResult<T>> {
        Json(Self {
            error: Some(error),
            data: None,
        })
    }
    pub fn new_data(data: T) -> Json<ApiResult<T>> {
        Json(Self {
            error: None,
            data: Some(data),
        })
    }
}

#[get("/api/projects/<project_id>/metadata")]
pub async fn get_project_metadata(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Option<ProjectMetadata>>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let metadata = project_entry.read().unwrap().metadata.clone();

    ApiResult::new_data(metadata)

}

#[post("/api/projects/<project_id>/metadata", data = "<metadata>")]
pub async fn set_project_metadata(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, metadata: Json<ProjectMetadata>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    project.metadata = Some(metadata.into_inner());

    ApiResult::new_data(())
}

#[get("/api/projects/<project_id>/settings")]
pub async fn get_project_settings(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Option<ProjectSettings>>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let settings = project_entry.read().unwrap().settings.clone();

    ApiResult::new_data(settings)
}

#[post("/api/projects/<project_id>/settings", data = "<project_settings>")]
pub async fn set_project_settings(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, project_settings: Json<ProjectSettings>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    project.settings = Some(project_settings.into_inner());

    ApiResult::new_data(())
}