use std::sync::Arc;
use config::File;
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::serde::json::Json;
use rocket::State;
use uuid::Uuid;
use crate::data_storage::ProjectStorage;
use crate::import::processing::{ImportJob, ImportProcessor, ImportStatus, ImportStatusPoll};
use crate::projects::api::{ApiError, ApiResult};
use crate::session::session_guard::Session;
use crate::settings::Settings;

#[derive(FromForm)]
struct FileUpload<'r>{
    files: Vec<TempFile<'r>>,
    bib_file: Option<TempFile<'r>>,
    project_id: String,
}

#[post("/api/import/upload", data = "<upload>")]
pub async fn import_from_upload(mut upload: Form<FileUpload<'_>>, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, import_processor: &State<Arc<ImportProcessor>>) -> Json<ApiResult<uuid::Uuid>>{
    println!("Uploading files to project {}", upload.project_id);

    let mut file_paths = vec![];

    // Persisting the files to disk
    for file in upload.files.iter_mut(){
        let path = format!("{}/temp/{}", settings.data_path, Uuid::new_v4());
        file.copy_to(path.clone()).await.unwrap();
        let content_type = match file.content_type(){
            Some(content_type) => content_type,
            None => return ApiResult::new_error(ApiError::BadRequest("Invalid file type".to_string()))
        };

        file_paths.push((path, content_type.clone()));
    }

    // Persisting bib file
    let bib_file_path = match upload.bib_file.as_mut(){
        Some(file) => {
            let path = format!("{}/temp/{}", settings.data_path, Uuid::new_v4());
            file.copy_to(path.clone()).await.unwrap();
            Some(path)
        },
        None => None
    };

    let project_id = match uuid::Uuid::parse_str(&upload.project_id){
        Ok(id) => id,
        Err(_) => return ApiResult::new_error(ApiError::BadRequest("Invalid project id".to_string()))
    };

    let id = uuid::Uuid::new_v4();
    let import_job = ImportJob{
        id,
        project_id,
        length: file_paths.len() as usize,
        processed: 0,
        files_to_process: file_paths,
        bib_file: bib_file_path,
        status: ImportStatus::Pending,
    };

    import_processor.job_queue.write().unwrap().push(import_job);

    ApiResult::new_data(id)
}

#[get("/api/import/status/<id>")]
pub async fn poll_import_status(id: String, _session: Session, import_processor: &State<Arc<ImportProcessor>>) -> Json<ApiResult<ImportStatusPoll>>{
    let job_archive = import_processor.job_archive.read().unwrap();

    let id = match uuid::Uuid::parse_str(&id){
        Ok(id) => id,
        Err(_) => return ApiResult::new_error(ApiError::BadRequest("Invalid job id".to_string()))
    };

    match job_archive.get(&id){
        Some(job) =>{
            let job = job.read().unwrap();
            let status = ImportStatusPoll{
                status: job.status.clone(),
                processed: job.processed,
                length: job.length,
            };
            return ApiResult::new_data(status);
        },
        None => ()
    }
    let job_queue = import_processor.job_queue.read().unwrap();

    let job = job_queue.iter().find(|job| job.id == id);
    match job{
        Some(job) => ApiResult::new_data(ImportStatusPoll{
            status: job.status.clone(),
            processed: job.processed,
            length: job.length,
        }),
        None => ApiResult::new_error(ApiError::NotFound)
    }
}