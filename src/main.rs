use rocket_dyn_templates::Template;
use rocket::Request;
use rocket::response::Redirect;
//noinspection RsMainFunctionNotFound
use crate::session::session_storage::SessionStorage;
use crate::settings::Settings;

pub mod dashboard;
mod settings;
pub mod db;
pub mod schema;
pub mod session;

#[macro_use] extern crate rocket;

#[catch(401)]
fn forward_to_login<'r>() -> rocket::response::Redirect {
    Redirect::to("/login")
}
#[launch]
fn rocket() -> _ {

    rocket::build()
        .register("/", catchers![forward_to_login])
        .attach(Template::fairing())
        .mount("/css", rocket::fs::FileServer::from("static/css"))
        .mount("/js", rocket::fs::FileServer::from("static/js"))
        .mount("/", routes![dashboard::project_overview::show_project_overview, session::login::login_page, session::login::process_login, session::logout::logout_page])
        .manage(SessionStorage::new())
        .manage(Settings::new().unwrap())
}