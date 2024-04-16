use std::collections::BTreeMap;
use std::sync::Arc;
use rocket::http::Status;
use rocket::State;
use crate::data_storage::{DataStorage, ProjectTemplate};
use crate::session::session_guard::Session;
use crate::settings::Settings;

/// Get a list of all templates
#[get("/templates")]
pub async fn list_templates(_session: Session) -> Result<rocket_dyn_templates::Template, Status>{
    Ok(rocket_dyn_templates::Template::render("templates", ()))
}

/// Create new template
#[get("/templates/create")]
pub async fn create_template(_session: Session) -> Result<rocket_dyn_templates::Template, Status>{
    Ok(rocket_dyn_templates::Template::render("create_template", ()))
}

#[derive(FromForm)]
pub struct CreateTemplate {
    pub name: String,
    pub description: String,
}

#[post("/templates/create", data = "<template>")]
pub async fn form_create_template(_session: Session, settings: &State<Settings>, template: rocket::form::Form<CreateTemplate>, data_storage: &State<Arc<DataStorage>>) -> Result<rocket::response::Redirect, Status>{
    let template = ProjectTemplate {
        id: uuid::Uuid::new_v4(),
        name: template.name.clone(),
        description: template.description.clone(),
    };
    let mut data_storage = data_storage.clone();
    data_storage.insert_template(template, settings).await.unwrap();
    Ok(rocket::response::Redirect::to("/templates"))
}