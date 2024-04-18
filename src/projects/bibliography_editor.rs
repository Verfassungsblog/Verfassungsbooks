use std::sync::Arc;
use rocket::http::Status;
use rocket::State;
use rocket_dyn_templates::Template;
use crate::data_storage::ProjectStorage;
use crate::session::session_guard::Session;
use crate::settings::Settings;

#[get("/projects/<project_id>/bibliography")]
pub async fn show_bib_editor(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Result<Template, Status> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return Err(Status::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return Err(Status::NotFound);
        },
    };

    Ok(Template::render("bibliography", project_id))
}

pub mod api{
    use std::future::Future;
    use std::sync::{Arc, RwLock};
    use hayagriva::types::EntryType;
    use hayagriva::{Entry, Library};
    use rocket::form::Form;
    use rocket::http::hyper::body::HttpBody;
    use rocket::serde::json::Json;
    use rocket::State;
    use serde::{Deserialize, Serialize};
    use crate::data_storage::{BibEntryV2, OldBibEntry, OldProjectData, ProjectStorage};
    use crate::projects::api::{ApiError, ApiResult};
    use crate::session::session_guard::Session;
    use crate::settings::Settings;

    #[derive(Deserialize, Serialize)]
    struct NewBibEntry{
        pub key: String,
        pub entry_type: EntryType,
    }

    /// Get a list of all bibliography entry keys in the project
    #[get("/api/projects/<project_id>/bibliography")]
    pub async fn get_library(_session: Session, project_id: String, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Vec<String>>>{
        let project_id = match uuid::Uuid::parse_str(&project_id) {
            Ok(project_id) => project_id,
            Err(e) => {
                eprintln!("Couldn't parse project id: {}", e);
                return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
            },
        };

        let project_storage_cpy = project_storage.clone();
        let project = match project_storage_cpy.get_project(&project_id, &settings).await{
            Ok(project) => project.clone(),
            Err(_) => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        let mut entries: Vec<String> =project.read().unwrap().bibliography.keys().map(|a|a.to_string()).collect();
        entries.sort();
        return ApiResult::new_data(entries);
    }

    /// Get a bibliography entry by its key
    #[get("/api/projects/<project_id>/bibliography/<entry_key>")]
    pub async fn get_bib_entry(_session: Session, project_id: String, entry_key: String, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<BibEntryV2>>{
        let project_id = match uuid::Uuid::parse_str(&project_id) {
            Ok(project_id) => project_id,
            Err(e) => {
                eprintln!("Couldn't parse project id: {}", e);
                return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
            },
        };

        let project_storage_cpy = project_storage.clone();
        let project = match project_storage_cpy.get_project(&project_id, &settings).await{
            Ok(project) => project.clone(),
            Err(_) => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        let entry = match project.read().unwrap().bibliography.get(&entry_key){
            Some(entry) => entry.clone(),
            None => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        return ApiResult::new_data(entry);
    }

    /// Search for bibliography entries by their key or title
    #[get("/api/projects/<project_id>/bibliography/search?<query>")]
    pub async fn search_bib_entry(_session: Session, project_id: String, query: String, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Vec<BibEntryV2>>>{
        let project_id = match uuid::Uuid::parse_str(&project_id) {
            Ok(project_id) => project_id,
            Err(e) => {
                eprintln!("Couldn't parse project id: {}", e);
                return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
            },
        };

        let project_storage_cpy = project_storage.clone();
        let project = match project_storage_cpy.get_project(&project_id, &settings).await{
            Ok(project) => project.clone(),
            Err(_) => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        let mut res = vec![];

        for (key, entry) in project.read().unwrap().bibliography.iter(){
            if key.contains(&query){
                res.push(entry.clone());
            }else if let Some(title) = entry.title.as_ref(){
                if title.value.to_string().contains(&query){
                    res.push(entry.clone());
                }
            }
        }

        return ApiResult::new_data(res);
    }


    #[post("/api/projects/<project_id>/bibliography", data="<new_bib_entry>")]
    pub async fn add_bib_entry(new_bib_entry: Json<NewBibEntry>, _session: Session, project_id: String, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<BibEntryV2>>{
        let project_id = match uuid::Uuid::parse_str(&project_id) {
            Ok(project_id) => project_id,
            Err(e) => {
                eprintln!("Couldn't parse project id: {}", e);
                return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
            },
        };

        let new_bib_entry = new_bib_entry.into_inner();
        let entry = BibEntryV2::new(new_bib_entry.key.clone(), new_bib_entry.entry_type);

        let project_storage_cpy = project_storage.clone();
        let project = match project_storage_cpy.get_project(&project_id, &settings).await{
            Ok(project) => project.clone(),
            Err(_) => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        if project.read().unwrap().bibliography.get(&new_bib_entry.key).is_some(){
            return ApiResult::new_error(ApiError::BadRequest("There is already a bib entry with this key.".to_string()))
        }

        project.write().unwrap().bibliography.insert(new_bib_entry.key.clone(), entry.clone());
        return ApiResult::new_data(entry);
    }

    #[put("/api/projects/<project_id>/bibliography/<key>", data="<bib_entry>")]
    pub async fn update_bib_entry(bib_entry: Json<BibEntryV2>, key: &str, _session: Session, project_id: &str, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>>{
        let project_id = match uuid::Uuid::parse_str(&project_id) {
            Ok(project_id) => project_id,
            Err(e) => {
                eprintln!("Couldn't parse project id: {}", e);
                return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
            },
        };

        let bib_entry = bib_entry.into_inner();

        let project_storage_cpy = project_storage.clone();
        let project = match project_storage_cpy.get_project(&project_id, &settings).await{
            Ok(project) => project.clone(),
            Err(_) => {
                return ApiResult::new_error(ApiError::NotFound)
            }
        };

        if project.read().unwrap().bibliography.get(key).is_none(){
            return ApiResult::new_error(ApiError::NotFound)
        }

        project.write().unwrap().bibliography.remove(key);
        project.write().unwrap().bibliography.insert(bib_entry.key.clone(), bib_entry.clone());
        return ApiResult::new_data(());
    }

}