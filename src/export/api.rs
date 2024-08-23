use std::path::PathBuf;
use std::sync::Arc;
use rocket::fs::NamedFile;
use rocket::http::Status;
use rocket::serde::{Deserialize, Serialize};
use rocket::serde::json::Json;
use rocket::State;
use vb_exchange::RenderingStatus;
use crate::export::rendering_manager::{LocalRenderingRequest, RenderingManager};
use crate::projects::api::{ApiError, ApiResult};
use crate::session::session_guard::Session;
use crate::templates_editor::api::safe_path_combine;

/// Just like [LocalRenderingRequest] but without an request_id
#[derive(Serialize, Deserialize)]
struct NewLocalRenderingRequest{
    /// id of the project to render
    pub project_id: uuid::Uuid,
    /// list of export formats slugs that should be rendered
    pub export_formats: Vec<String>,
    /// list of section ids to be prepared, or None if all sections should be prepared
    pub sections: Option<Vec<uuid::Uuid>>
}

/// POST /api/export/request
/// Create a new local rendering request and add it to the queue to be sent to the next available rendering server#
///
/// Returns the [uuid::Uuid] of the created rendering request
#[post("/api/export/request", data="<request>")]
pub fn add_local_rendering_request(_session: Session, rendering_manager: &State<Arc<RenderingManager>>, request: Json<NewLocalRenderingRequest>) -> Json<ApiResult<uuid::Uuid>>{
    let rendering_manager = Arc::clone(rendering_manager.inner());
    let request = request.into_inner();

    // Generate request id
    let request_id = uuid::Uuid::new_v4();

    let request = LocalRenderingRequest{
        request_id: request_id.clone(),
        project_id: request.project_id,
        export_formats: request.export_formats,
        sections: request.sections,
    };

    rendering_manager.rendering_queue.write().unwrap().push_back(request);
    rendering_manager.requests_archive.write().unwrap().insert(request_id.clone(), RenderingStatus::QueuedOnLocal);

    ApiResult::new_data(request_id)
}

/// Simplified version of [RenderingStatus]
#[derive(Serialize, Deserialize)]
pub enum APIRenderingStatus{
    QueuedOnLocal,
    PreparingOnLocal,
    PreparedOnLocal,
    SendToRenderingServer,
    RequestingTemplate,
    TransmittingTemplate,
    QueuedOnRendering,
    Running,
    SavedOnLocal,
    Failed(String)
}

impl From<&RenderingStatus> for APIRenderingStatus{
    fn from(value: &RenderingStatus) -> Self {
        match value{
            RenderingStatus::QueuedOnLocal => APIRenderingStatus::QueuedOnRendering,
            RenderingStatus::PreparingOnLocal => APIRenderingStatus::PreparingOnLocal,
            RenderingStatus::PreparedOnLocal => APIRenderingStatus::PreparedOnLocal,
            RenderingStatus::SendToRenderingServer => APIRenderingStatus::SendToRenderingServer,
            RenderingStatus::RequestingTemplate => APIRenderingStatus::RequestingTemplate,
            RenderingStatus::TransmittingTemplate => APIRenderingStatus::TransmittingTemplate,
            RenderingStatus::QueuedOnRendering => APIRenderingStatus::QueuedOnRendering,
            RenderingStatus::Running => APIRenderingStatus::Running,
            RenderingStatus::Finished(_) => APIRenderingStatus::SavedOnLocal,
            RenderingStatus::SavedOnLocal(_, _) => APIRenderingStatus::SavedOnLocal,
            RenderingStatus::Failed(e) => APIRenderingStatus::Failed(e.to_string())
        }
    }
}

/// GET /api/export/request/<request_id>/status
/// Get the status of the request
#[get("/api/export/request/<request_id>/status")]
pub fn get_request_status(_session: Session, request_id: &str, rendering_manager: &State<Arc<RenderingManager>>) -> Json<ApiResult<APIRenderingStatus>>{
    let request_id = match uuid::Uuid::parse_str(request_id){
        Ok(res) => res,
        Err(_) => {
            return ApiResult::new_error(ApiError::BadRequest("Invalid request_id.".to_string()))
        }
    };

    let rendering_manager = Arc::clone(rendering_manager);

    let status = match rendering_manager.requests_archive.read().unwrap().get(&request_id){
        Some(status) => {
            APIRenderingStatus::from(status)
        },
        None => {
            return ApiResult::new_error(ApiError::NotFound)
        }
    };

    ApiResult::new_data(status)
}

/// GET /export/<request_id>/<filename>
/// Get a specific file from the rendering result
#[get("/export/<request_id>/<filename>")]
pub async fn get_request_result_specific_file(_session: Session, request_id: &str, filename: &str, rendering_manager: &State<Arc<RenderingManager>>) -> Result<NamedFile, Status>{
    let request_id = match uuid::Uuid::parse_str(request_id){
        Ok(res) => res,
        Err(_) => {
            return Err(Status::BadRequest)
        }
    };

    // Find out if rendering request exists, is finished and where result file is
    let rendering_manager = Arc::clone(rendering_manager);

    let path = match rendering_manager.requests_archive.read().unwrap().get(&request_id){
        Some(status) => {
            match status{
                RenderingStatus::SavedOnLocal(_, folder_path) => folder_path.clone(),
                _ => {
                    return Err(Status::NotFound)
                }
            }
        },
        None => {
            return Err(Status::NotFound)
        }
    };

    let respath = match safe_path_combine(path.to_str().unwrap_or("invalid"), filename){
        Ok(res) => res,
        Err(_) => {
            return Err(Status::BadRequest)
        }
    };
    match NamedFile::open(respath).await{
        Ok(res) => Ok(res),
        Err(e) => {
            eprintln!("Couldn't open rendering result file: {}", e);
            Err(Status::NotFound) //TODO: delete request entry
        }
    }
}

/// GET /export/<request_id>
/// Get the export result file
#[get("/export/<request_id>")]
pub async fn get_request_result(_session: Session, request_id: &str, rendering_manager: &State<Arc<RenderingManager>>) -> Result<NamedFile, Status>{
    let request_id = match uuid::Uuid::parse_str(request_id){
        Ok(res) => res,
        Err(_) => {
            return Err(Status::BadRequest)
        }
    };

    // Find out if rendering request exists, is finished and where result file is
    let rendering_manager = Arc::clone(rendering_manager);

    let path = match rendering_manager.requests_archive.read().unwrap().get(&request_id){
        Some(status) => {
            match status{
                RenderingStatus::SavedOnLocal(path, _) => path.clone(),
                _ => {
                    return Err(Status::NotFound)
                }
            }
        },
        None => {
            return Err(Status::NotFound)
        }
    };
    match NamedFile::open(path).await{
        Ok(res) => Ok(res),
        Err(e) => {
            eprintln!("Couldn't open rendering result file: {}", e);
            Err(Status::NotFound) //TODO: delete request entry
        }
    }
}