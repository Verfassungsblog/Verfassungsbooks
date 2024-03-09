use std::sync::Arc;
use config::File;
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::serde::json::Json;
use rocket::State;
use crate::data_storage::ProjectStorage;
use crate::projects::api::ApiResult;
use crate::session::session_guard::Session;
use crate::settings::Settings;

#[derive(FromForm)]
struct FileUpload<'r>{
    files: Vec<TempFile<'r>>,
    bib_file: Option<TempFile<'r>>,
    project_id: String,
}

#[post("/api/import/upload", data = "<upload>")]
pub fn import_from_upload(upload: Form<FileUpload>, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>>{
    println!("Uploading files to project {}", upload.project_id);

    //TODO: add to import queue

    ApiResult::new_data(())
}