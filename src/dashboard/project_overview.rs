use rocket_dyn_templates::Template;
use crate::session::session_guard::Session;

#[get("/")]
pub fn show_project_overview(session: Session) -> Template {
    Template::render("dashboard", ())
}