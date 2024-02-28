use std::sync::Arc;
use rocket::http::Status;
use rocket::State;
use rocket_dyn_templates::Template;
use crate::data_storage::DataStorage;
use crate::session::session_guard::Session;

#[get("/persons/create")]
pub async fn show_create_person(_session: Session, data_storage: &State<Arc<DataStorage>>) -> Result<Template, Status> {

    Ok(Template::render("create_person", ()))
}