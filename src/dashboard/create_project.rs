use crate::session::session_guard::Session;
use rocket_dyn_templates::Template;

/// Show page to create new project
#[get("/projects/create")]
pub fn show_create_project(session: Session) -> Template {
    Template::render("create_project", ())
}