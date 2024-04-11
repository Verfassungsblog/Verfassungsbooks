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
use crate::utils::csl::CslData;

mod settings;
pub mod session;
pub mod projects;
pub mod persons;
pub mod data_storage;
pub mod utils;
pub mod settings_page;
pub mod import;
pub mod export;


#[macro_use] extern crate rocket;

/// This is the catch-all route that redirects all 401 errors to the login page.
#[catch(401)]
fn forward_to_login<'r>() -> Redirect {
    Redirect::to("/login")
}


/// Starts the web server, mounts all routes and attaches the [SessionStorage][session::session_storage::SessionStorage] and [Settings][settings::Settings] structs.
#[launch]
async fn rocket() -> _ {
    let settings = Settings::new().unwrap();
    let settings_cpy = settings.clone();

    //Check if data directory exists, if not create it
    if !std::path::Path::new(&format!("{}/projects", settings.data_path)).exists() {
        println!("Data directory does not exist, creating it...");
        std::fs::create_dir_all(format!("{}/projects", settings.data_path)).unwrap(); //Intentionally panic if directory creation fails
        //Create empty DataStorage
        println!("Creating empty data storage...");
        let mut data_storage = data_storage::DataStorage::new();
        data_storage.insert_template(data_storage::ProjectTemplate{
            id: uuid::Uuid::parse_str("b8d7844d-a7e3-470e-bea3-7b657bf1d6cf").unwrap(),
            name: "Verfassungsbooks".to_string(),
            description: "".to_string()
        }, &settings).await.unwrap();
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
            id: uuid::Uuid::new_v4(),
            name: String::from("default"),
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

    // Clear temp directory
    let path = format!("{}/temp", settings.data_path);
    let temp_dir = std::path::Path::new(&path);
    if temp_dir.exists(){
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
    std::fs::create_dir(temp_dir).unwrap();

    println!("Loading data storage...");
    let data_storage = Arc::new(data_storage::DataStorage::load_from_disk(&settings).await.unwrap());
    println!("Loading project storage...");
    let project_storage = Arc::new(data_storage::ProjectStorage::new());
    project_storage.load_from_directory(&settings).await.unwrap();

    println!("Loaded Projects:");
    for project in project_storage.projects.read().unwrap().iter() {
        println!("Project: {:?}", project.1.name);
    };

    println!("Loading Citation Locale Files & Styles...");
    let csl_data = Arc::new(CslData::new(&settings_cpy));

    println!("Starting auto-save worker...");
    // Start seperate thread for auto-saving
    data_storage::save_data_worker(data_storage.clone(), project_storage.clone(), settings.clone()).await;

    println!("Starting rendering worker...");
    let rendering_manager = export::rendering_manager::RenderingManager::start(settings.clone(), data_storage.clone(), csl_data.clone());

    println!("Starting import processing worker...");
    let import_manager = import::processing::ImportProcessor::start(settings.clone(), project_storage.clone());

    println!("Starting web server...");
    rocket::build()
        .register("/", catchers![forward_to_login])
        .attach(Template::fairing())
        .mount("/css", rocket::fs::FileServer::from("static/css"))
        .mount("/js", rocket::fs::FileServer::from("static/js"))
        .mount("/", routes![utils::lobid_proxy::search_gnd, session::logout::logout_page, session::login::login_page, session::login::process_login_form, projects::create::show_create_project, projects::api::get_csl_styles, projects::create::process_create_project, projects::list::list_projects, projects::editor::show_editor, projects::bibliography_editor::show_bib_editor, projects::bibliography_editor::api::get_library, projects::bibliography_editor::api::update_bib_entry, projects::bibliography_editor::api::get_bib_entry, projects::bibliography_editor::api::search_bib_entry, projects::bibliography_editor::api::add_bib_entry, projects::api::get_project_metadata, projects::api::get_project_settings, projects::api::set_project_metadata, projects::api::set_project_settings, projects::api::add_author_to_project, projects::api::add_editor_to_project, projects::api::remove_editor_from_project, projects::api::remove_author_from_project, projects::api::add_keyword_to_project, projects::api::remove_keyword_from_project, projects::api::add_identifier_to_project, projects::api::remove_identifier_from_project, projects::api::update_identifier_in_project, persons::list::list_persons, persons::create::show_create_person, persons::api::create_person, persons::api::get_person, persons::api::update_person, persons::api::search_persons, projects::api::patch_project_metadata, projects::api::get_project_contents, projects::api::add_content, projects::api::move_content_after, projects::api::move_content_child_of, projects::api::get_section, projects::api::update_section, projects::api::delete_section, projects::api::get_content_blocks_in_section, projects::api::set_content_blocks_in_section, projects::api::render_project, projects::api::get_rendering_status, projects::api::upload_to_project, import::upload::poll_import_status, projects::api::get_project_upload, import::upload::import_from_wordpress, export::download::download_rendering, settings_page::settings_page, settings_page::api::add_user, settings_page::api::update_user, settings_page::api::delete_user, import::upload::import_from_upload])
        .manage(SessionStorage::new())
        .manage(settings)
        .manage(data_storage)
        .manage(project_storage)
        .manage(rendering_manager)
        .manage(import_manager)
        .manage(csl_data)
}

//TODO: clean shutdown