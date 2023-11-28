use std::collections::BTreeMap;
use std::str::FromStr;
use rocket::State;
use rocket_dyn_templates::Template;
use sqlx::PgPool;
use crate::db;
use crate::session::session_guard::Session;
use rocket::http::Status;

#[get("/?<page>")]
pub async fn show_project_overview(page: Option<i32>, _session: Session, db_pool: &State<PgPool>) -> Result<Template, Status> {
    let page = match page{
        Some(page) => page,
        None => 1,
    };

    let limit = 10;
    let offset = (page - 1) * limit;

    let projects = match db::projects::get_projects(limit, offset, db_pool).await{
        Ok(projects) => projects,
        Err(e) => {
            eprintln!("Couldn't get projects: {}", e);
            return Err(Status::InternalServerError);
        },
    };
    let mut data = BTreeMap::new();
    data.insert("projects", projects);
    Ok(Template::render("dashboard", data))
}