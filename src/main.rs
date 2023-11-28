//! Verfassungsbooks serves as a web application for the creation of books including
//! import and export from various formats.
//!
//! We are using the Rocket framework for the web application and sqlx for the database connection.
//!
//! # Settings
//! You have to create a new configuration file in the config folder to change the default settings.
//! The default settings are stored in the file config/default.toml, create a new file named "local.toml" in the same folder.
//! You want to change at least the database_string to your database connection string.
//!
//! # Database Setup
//! TODO
//noinspection RsMainFunctionNotFound
use rocket_dyn_templates::Template;
use rocket::response::Redirect;
use crate::session::session_storage::SessionStorage;
use crate::settings::Settings;

pub mod dashboard;
mod settings;
pub mod db;
pub mod session;
pub mod projects;

#[macro_use] extern crate rocket;

/// This is the catch-all route that redirects all 401 errors to the login page.
#[catch(401)]
fn forward_to_login<'r>() -> rocket::response::Redirect {
    Redirect::to("/login")
}

/// Starts the web server, mounts all routes and attaches the [SessionStorage][session::session_storage::SessionStorage] and [Settings][settings::Settings] structs.
#[launch]
async fn rocket() -> _ {
    //Create database connection pool
    let db_pool = db::connection_pool::create(Settings::new().unwrap()).await;

    //Check if database is already setup
    match db::setup::get_current_db_scheme_version(&db_pool).await.unwrap(){
        Some(version) => {
            println!("Database is set up. Version is {}", version);
        },
        None => {
            println!("Database is not setup, starting setup.");
            match db::setup::setup_database(&db_pool).await{
                Ok(_) => {
                    println!("Database setup successful.");
                },
                Err(e) => {
                    println!("Database setup failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }

    rocket::build()
        .register("/", catchers![forward_to_login])
        .attach(Template::fairing())
        .mount("/css", rocket::fs::FileServer::from("static/css"))
        .mount("/js", rocket::fs::FileServer::from("static/js"))
        .mount("/", routes![dashboard::project_overview::show_project_overview, session::logout::logout_page, session::login::login_page, session::login::process_login, projects::create::show_create_project, projects::create::process_create_project, projects::editor::get_project])
        .manage(SessionStorage::new())
        .manage(Settings::new().unwrap())
        .manage(db_pool)
}