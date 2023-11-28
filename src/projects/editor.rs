use rocket::http::Status;
use rocket::State;
use rocket_dyn_templates::Template;
use sqlx::PgPool;
use crate::session::session_guard::Session;

#[get("/projects/<project_id>")]
pub async fn get_project(project_id: String, db_pool: &State<PgPool>, _session: Session) -> Result<Template, Status> {
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

    Ok(Template::render("editor", project))
}