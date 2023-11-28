use std::collections::BTreeMap;
use rocket::http::Status;
use rocket::response::Redirect;
use rocket::State;
use rocket_dyn_templates::Template;
use sqlx::PgPool;
use crate::db::templates::get_project_templates;
use crate::session::session_guard::Session;

/// Show create project form
#[get("/projects/create")]
pub async fn show_create_project(db_pool: &State<PgPool>, session: Session) -> Result<Template, Status> {
    let templates = match get_project_templates(&db_pool).await {
        Ok(templates) => templates,
        Err(_) => {
            return Err(Status::InternalServerError);
        }
    };
    let mut data = BTreeMap::new();
    data.insert("templates", templates);
    Ok(Template::render("create_project", data))
}
#[derive(FromForm)]
pub struct CreateProjectForm{
    pub project_name: String,
    pub template_id: String,
    pub project_description: Option<String>,
}

/// Process create project form
#[post("/projects/create", data = "<data>")]
pub async fn process_create_project(db_pool: &State<PgPool>, session: Session, data: rocket::form::Form<CreateProjectForm>) -> Result<Redirect, Status> {
    let template_id = match uuid::Uuid::try_parse(&data.template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template_id from create new project form: {}", e);
            return Err(Status::BadRequest);
        }
    };

    match crate::db::projects::add_project(data.project_name.clone(), data.project_description.clone(), template_id, &db_pool).await{
        Ok(_) => {
            // TODO: Grant current user access to new project
            Ok(Redirect::to("/"))
        },
        Err(e) => {
            eprintln!("Couldn't add project: {}", e);
            Err(Status::InternalServerError)
        }
    }
}