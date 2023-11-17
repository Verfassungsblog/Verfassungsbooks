use crate::session::session_guard::Session;

#[get("/")]
pub fn show_project_overview(session: Session) -> &'static str {
    "Hello, world!"
}