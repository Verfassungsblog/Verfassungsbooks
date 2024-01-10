//! Verfassungsbooks serves as a web application for the creation of books including
//! import and export from various formats.
//!
//! # Settings
//! You have to create a new configuration file in the config folder to change the default settings.
//! The default settings are stored in the file config/default.toml, create a new file named "local.toml" in the same folder.

use std::sync::Arc;
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::rand_core::OsRng;
//noinspection RsMainFunctionNotFound
use rocket_dyn_templates::Template;
use rocket::response::Redirect;
use crate::data_storage::User;
use crate::session::session_storage::SessionStorage;
use crate::settings::Settings;
use rand::Rng;

mod settings;
pub mod session;
pub mod projects;
pub mod data_storage;
pub mod api;

#[macro_use] extern crate rocket;

/// This is the catch-all route that redirects all 401 errors to the login page.
#[catch(401)]
fn forward_to_login<'r>() -> rocket::response::Redirect {
    Redirect::to("/login")
}


/// Starts the web server, mounts all routes and attaches the [SessionStorage][session::session_storage::SessionStorage] and [Settings][settings::Settings] structs.
#[launch]
async fn rocket() -> _ {
    let settings = Settings::new().unwrap();
    //Check if data directory exists, if not create it
    if !std::path::Path::new(settings.data_path.as_str()).exists() {
        println!("Data directory does not exist, creating it...");
        std::fs::create_dir_all(format!("{}/projects", settings.data_path)).unwrap(); //Intentionally panic if directory creation fails
        //Create empty DataStorage
        println!("Creating empty data storage...");
        let mut data_storage = data_storage::DataStorage::new();
        //Create new admin user
        let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
        const PASSWORD_CHARACTERS: [char; 92] = [
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-',
            '=', '[', ']', '{', '}', '|', '\\', ';', ':', '\'', '"', ',', '.',
            '<', '>', '/', '?'
        ];
        let mut password: String = "".to_string();
        {
            let mut random = rand::thread_rng();
            password = (0..20).map(|_| PASSWORD_CHARACTERS[random.gen_range(0..PASSWORD_CHARACTERS.len())]).collect();
        }
        let user = User{
            email: String::from("default@default"),
            password_hash: Argon2::default().hash_password(&password.as_bytes(),&salt).unwrap().to_string(),
            locked_until: None,
            login_attempts: Vec::new()
        };
        data_storage.insert_user(user, &settings).await.unwrap();
        data_storage.insert_template(data_storage::ProjectTemplate{
            id: uuid::Uuid::new_v4(),
            name: "default".to_string(),
            description: "default project".to_string()
        }, &settings).await.unwrap();
        data_storage.save_to_disk(&settings).await.unwrap();
        println!("Created new default admin user 'default@default' with password '{}'", password);
    }

    println!("Loading data storage...");
    let data_storage = Arc::new(data_storage::DataStorage::load_from_disk(&settings).await.unwrap());
    println!("Loading project storage...");
    let project_storage = Arc::new(data_storage::ProjectStorage::new());
    project_storage.load_from_directory(&settings).await.unwrap();

    for project in project_storage.projects.read().unwrap().iter() {
        println!("Project: {:?}", project.1.name);
    };

    println!("Starting auto-save worker...");
    // Start seperate thread for auto-saving
    data_storage::save_data_worker(data_storage.clone(), project_storage.clone(), settings.clone()).await;

    println!("Starting web server...");
    rocket::build()
        .register("/", catchers![forward_to_login])
        .attach(Template::fairing())
        .mount("/css", rocket::fs::FileServer::from("static/css"))
        .mount("/js", rocket::fs::FileServer::from("static/js"))
        .mount("/", routes![session::logout::logout_page, session::login::login_page, session::login::process_login_form, projects::create::show_create_project, projects::create::process_create_project, projects::list::list_projects, projects::editor::show_editor])
        .manage(SessionStorage::new())
        .manage(settings)
        .manage(data_storage)
        .manage(project_storage)
}