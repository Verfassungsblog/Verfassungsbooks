use rocket::fs::NamedFile;
use rocket::http::Status;
use rocket::State;
use crate::session::session_guard::Session;
use crate::settings::Settings;

#[get("/download/renderings/<id>")]
pub async fn download_rendering(id: String, settings: &State<Settings>, _session: Session) -> Result<NamedFile, Status> {
    let path = format!("{}/temp/{}/output.pdf", settings.data_path, id);
    let file = NamedFile::open(path).await.map_err(|_| Status::NotFound)?;
    Ok(file)
}