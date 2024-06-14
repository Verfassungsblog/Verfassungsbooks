use crate::data_storage::{DataStorage, ProjectTemplateV2};
use rocket::http::Status;
use uuid::Uuid;
use rocket::State;
use rocket::form::Form;
use rocket::fs::{NamedFile, TempFile};
use std::path::Path;
use std::sync::Arc;
use rocket::serde::json::Json;
use crate::projects::api::{ApiResult, ApiError};
use crate::session::session_guard::Session;
use std::io;
use std::fs;
use std::path::PathBuf;
use crate::templates_editor::export_steps::ExportFormat;

/// Contains API endpoints for the templates editor.

/// GET /api/templates/<template_id>
/// Get a template by its id.
#[get("/api/templates/<template_id>")]
pub async fn get_template(_session: Session, template_id: String, data_storage: &State<Arc<DataStorage>>) -> Json<ApiResult<ProjectTemplateV2>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    let data_storage = data_storage.clone();

    // Get template from data storage
    let lock = data_storage.data.read().unwrap();
    let template = lock.templates.get(&template_id);
    template.map_or_else(|| ApiResult::new_error(ApiError::NotFound), |template| ApiResult::new_data(template.clone().read().unwrap().clone()))
}

/// POST /api/templates/<template_id>
/// Update a template by its id.
/// The template id in the url must match the id in the body.
/// Can't be used to create a new template.
#[post("/api/templates/<template_id>", data = "<template>")]
pub async fn update_template(_session: Session, template_id: String, template: Json<ProjectTemplateV2>, data_storage: &State<Arc<DataStorage>>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    let data_storage = data_storage.clone();

    // Check if template exists, otherwise return 404
    let lock = data_storage.data.read().unwrap();
    if !lock.templates.contains_key(&template_id){
        return ApiResult::new_error(ApiError::NotFound);
    }

    // Check if id in template matches id in url
    if template_id != template.id {
        return ApiResult::new_error(ApiError::BadRequest("Template id in url does not match template id in body, id change is not supported.".to_string()));
    }

    *lock.templates.get(&template_id).unwrap().write().unwrap() = template.into_inner();

    ApiResult::new_data(())
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct AssetList{
    pub assets: Vec<Asset> 
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct AssetFolder{
    /// Path to the folder to identify uniquily, e.g. folder1.folder2
    pub path: String,
    /// Name of the folder, unique inside the parent folder
    pub name: String,
    /// Subfolders and files inside this folder
    pub assets: Vec<Asset>
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct AssetFile{
    /// Path to the file to identify uniquily, e.g. folder1.folder2.file1
    pub path: String,
    /// Name of the file, unique inside the parent folder
    pub name: String,
    /// Mime type of the file to determine if editable in browser, e.g. "text/plain" TODO: auto detect mime type
    pub mime_type: Option<String>,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub enum Asset{
    Folder(AssetFolder),
    File(AssetFile)
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct NewAssetFolder{
    pub name: String,
}

#[derive(FromForm)]
pub struct NewAssetFile<'r>{
    pub file: TempFile<'r>
}

fn sanitize_path(path: &str) -> String {
    // Entfernen von `../` und `./`
    let path = path.replace("../", "").replace("./", "");

    // Remove leading / if present
    let path = if path.starts_with("/") {
        &path[1..]
    } else {
        &path
    };

    // Erlaubte Zeichen sind alphanumerische Zeichen, Unterstrich, Bindestrich, Punkt und Schrägstrich
    let allowed_chars = |c: &char| c.is_alphanumeric() || *c == '_' || *c == '-' || *c == '.' || *c == '/';
    path.chars().filter(allowed_chars).collect()
}

/// Safely combines a base path with a user input path.
fn safe_path_combine(base_path: &str, user_input: &str) -> Result<PathBuf, ()> {
    let sanitized_input = sanitize_path(user_input);
    if sanitized_input.is_empty() {
        return Err(());
    }
    let base = Path::new(base_path);
    let full_path = base.join(sanitized_input);

    // Sicherstellen, dass der resultierende Pfad im Basisverzeichnis bleibt
    if !full_path.starts_with(base) {
        return Err(());
    }

    Ok(full_path)
}


#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_safe_path_combine_valid_path() {
        let base_path = "/data/templates/template1/assets";
        let user_input = "folder1/file1.txt";
        let expected_result = Ok(PathBuf::from("/data/templates/template1/assets/folder1/file1.txt"));
        
        let result = safe_path_combine(base_path, user_input);
        
        assert_eq!(result, expected_result);
    }
    
    #[test]
    fn test_safe_path_combine_evil_path() {
        let base_path = "/data/templates/template1/assets";
        let user_input = "../folder1/file1.txt";
        let expected_result = Ok(PathBuf::from("/data/templates/template1/assets/folder1/file1.txt"));
        
        let result = safe_path_combine(base_path, user_input);
        
        assert_eq!(result, expected_result);
    }
    
    #[test]
    fn test_safe_path_combine_root_folder() {
        let base_path = "/data/templates/template1/assets";
        let user_input = "/folder1/file1.txt";
        let expected_result = Err(());
        
        let result = safe_path_combine(base_path, user_input);
        
        assert_eq!(result, expected_result);
    }
    #[test]
    fn test_safe_path_combine_empty_user_input() {
        let base_path = "/data/templates/template1/assets";
        let user_input = "";
        let expected_result = Err(());

        let result = safe_path_combine(base_path, user_input);

    let path = match safe_path_combine(&Path::new("data/templates/{}/assets/").canonicalize().unwrap().to_str().unwrap(), &path){
        Ok(path) => path,
        Err(e) => {
            eprintln!("Error deleting asset, invalid path.");
            return ApiResult::new_error(ApiError::BadRequest("Invalid path".to_string()));
        }
    };
        assert_eq!(result, expected_result);
    }
}

/// POST /api/templates/<template_id>/assets/file
/// Creates a new asset in the global assets folder of the template
#[post("/api/templates/<template_id>/assets/file", data = "<asset>")]
pub async fn create_file_asset(_session: Session, template_id: String, asset: Form<NewAssetFile<'_>>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    let mut file = asset.into_inner().file;

    let filename = match file.raw_name(){
        Some(name) => name,
        None => {
            eprintln!("No file name provided");
            return ApiResult::new_error(ApiError::BadRequest("No file name provided".to_string()));
        }
    };

    let filename = sanitize_path(filename.dangerous_unsafe_unsanitized_raw().as_str());

    println!("Filename: {}", filename);

    let mut path;

    loop{
        let mut i = 0;
        
        
        path = if i == 0{
            format!("data/templates/{}/assets/{}", template_id, filename)
        }else{
            let filename_splitted = filename.split('.').collect::<Vec<&str>>();

            let new_filename = if filename_splitted.len() == 1{ // File has no extension, add number to end
                format!("{}_{}", filename, i)
            }else{
                // Get all parts except the last one
                let filename_without_extension = filename_splitted.clone().iter().take(filename_splitted.len()-1).map(|s| format!("{}.", s)).collect::<String>();
                format!("{}_{}.{}", filename_without_extension, i, filename_splitted.last().unwrap())
            };

            format!("data/templates/{}/assets/{}", template_id, new_filename)
        };
        // Check if file already exists
        if Path::new(&path).exists(){
            i += 1;
        }else{
            break;
        }
    }
    match file.copy_to(path).await{
        Ok(_) => return ApiResult::new_data(()),
        Err(e) => {
            eprintln!("Error copying file: {}", e);
            return ApiResult::new_error(ApiError::InternalServerError);
        }
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct DeleteAssetRequest{
    pub paths: Vec<String>,
}

/// DELETE /api/templates/<template_id>/assets/<path>
/// Deletes an asset in the global assets folder of the template
#[delete("/api/templates/<template_id>/assets", data = "<paths>")]
pub async fn delete_assets(_session: Session, template_id: String, paths: Json<DeleteAssetRequest>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    let base_path_raw = Path::new(&format!("data/templates/{}/assets", template_id)).canonicalize().unwrap();
    let base_path = base_path_raw.to_str().unwrap();

    for path in &paths.paths{
        let path = match safe_path_combine(&base_path, &path){
            Ok(path) => path,
            Err(e) => {
                eprintln!("Error deleting asset, invalid path.");
                return ApiResult::new_error(ApiError::BadRequest("Invalid path".to_string()));
            }
        };

        // Check if directory or file
        if path.is_dir(){
            match tokio::fs::remove_dir_all(path).await{
                Ok(_) => (),
                Err(_) => {
                    eprintln!("Error deleting asset.");
                    return ApiResult::new_error(ApiError::InternalServerError);
                }
            }
        }else{
            match tokio::fs::remove_file(path).await{
                Ok(_) => (),
                Err(_) => {
                    eprintln!("Error deleting asset.");
                    return ApiResult::new_error(ApiError::InternalServerError);
                }
            }
        }
    }

    ApiResult::new_data(())
}

/// POST /api/templates/<template_id>/assets/folder
/// Creates a new asset in the global assets folder of the template
#[post("/api/templates/<template_id>/assets/folder", data = "<asset>")]
pub async fn create_folder_asset(_session: Session, template_id: String, asset: Json<NewAssetFolder>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    let name = asset.name.replace("/", "");

    // Get the path to the global assets folder
    let path = format!("data/templates/{}/assets/{}", template_id, name);

    // Create the folder
    let res = tokio::task::spawn_blocking(move || {
        match fs::create_dir(&path){
            Ok(_) => ApiResult::new_data(()),
            Err(e) => {
                match e.kind(){
                    io::ErrorKind::AlreadyExists => ApiResult::new_error(ApiError::Conflict("Folder already exists".to_string())),
                    _ => {
                        eprintln!("Error creating folder: {}", e);
                        ApiResult::new_error(ApiError::InternalServerError)
                    }
                }
            }
        }
    }).await;

    match res {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Error creating folder: {}", e);
            ApiResult::new_error(ApiError::InternalServerError)
        }
    }
}

/// GET /api/templates/<template_id>/assets
/// List all global assets saved for the template
#[get("/api/templates/<template_id>/assets")]
pub async fn get_assets(_session: Session, template_id: String) -> Json<ApiResult<AssetList>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    // Get all entries in the global assets folder (via async fs) inside data/templates/<template_id>/assets
    let res = tokio::task::spawn_blocking(move || {
        let path = format!("data/templates/{}/assets", template_id);
        match get_assets_recursive(&path, None){
            Ok(assets) => ApiResult::new_data(AssetList{assets}),
            Err(e) => {
                eprintln!("Error getting assets: {}", e);
                ApiResult::new_error(ApiError::InternalServerError)
            }
        }
    }).await;

    match res {
        Ok(assets) => assets,
        Err(e) => {
            eprintln!("Error getting assets: {}", e);
            ApiResult::new_error(ApiError::InternalServerError)
        }
    }
}

fn get_assets_recursive(current_path: &str, path_to_asset: Option<&String>) -> Result<Vec<Asset>, io::Error> {
    let mut assets: Vec<Asset> = Vec::new();
    let entries = fs::read_dir(current_path)?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        let path_to_asset = match path_to_asset {
            Some(path) => format!("{}/{}", path, entry.file_name().to_string_lossy().to_string()),
            None => entry.file_name().to_string_lossy().to_string(),
        };

        if path.is_dir() {
            let folder = AssetFolder {
                name: entry.file_name().to_string_lossy().to_string(),
                assets: get_assets_recursive(&path.to_string_lossy(), Some(&path_to_asset))?,
                path: path_to_asset.clone(),
            };
            assets.push(Asset::Folder(folder));
        } else {
            let file = AssetFile {
                name: entry.file_name().to_string_lossy().to_string(),
                mime_type: None, //TODO: remove if not needed
                path: path_to_asset
            };
            assets.push(Asset::File(file));
        }
    }

    Ok(assets)
}

/// GET /api/templates/<template_id>/assets/files/<path>
/// Get an specific File asset in the global assets folder of the template
#[get("/api/templates/<template_id>/assets/files/<path..>")]
pub async fn get_asset_file(_session: Session, template_id: String, path: PathBuf) -> Result<NamedFile, Status>{
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return Err(Status::NotFound);
        }
    };

    // Get the path to the global assets folder
    let path = match safe_path_combine(&format!("data/templates/{}/assets", template_id), &path.to_string_lossy()){ //TODO use path to data directory from config
        Ok(path) => path,
        Err(_) => {
            eprintln!("Error getting asset, invalid path.");
            return Err(Status::BadRequest);
        }
    };

    match NamedFile::open(path).await{
        Ok(file) => Ok(file),
        Err(e) => {
            eprintln!("Error getting asset: {}", e);
            Err(Status::NotFound)
        }
    }
}

#[derive(serde::Deserialize)]
pub struct UpdateAssetRequest{
    pub content: String,
}

/// PUT /api/templates/<template_id>/assets/files/<path>
/// Updates a text-based asset in the global assets folder of the template
/// The asset must be a text-based file, e.g. .txt, .html, .css, .js
#[put("/api/templates/<template_id>/assets/files/<path..>", data = "<content>")]
pub async fn update_asset_file(_session: Session, template_id: String, path: PathBuf, content: Json<UpdateAssetRequest>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };


    // Get the path to the global assets folder
    let path = match safe_path_combine(&format!("data/templates/{}/assets", template_id), &path.to_string_lossy()){ //TODO use path to data directory from config
        Ok(path) => path,
        Err(_) => {
            eprintln!("Error updating asset, invalid path.");
            return ApiResult::new_error(ApiError::BadRequest("Invalid path".to_string()));
        }
    };

    // Check if file exists
    if !path.exists(){
        return ApiResult::new_error(ApiError::NotFound);
    }

    // Update the file
    match tokio::fs::write(&path, content.into_inner().content).await{
        Ok(_) => ApiResult::new_data(()),
        Err(e) => {
            eprintln!("Error updating asset: {}", e);
            ApiResult::new_error(ApiError::InternalServerError)
        }
    }
}

/// POST /api/templates/<template_id>/assets/move
/// Moves an asset in the global assets folder of the template
#[post("/api/templates/<template_id>/assets/move", data = "<asset>")]
pub async fn move_asset(_session: Session, template_id: String, asset: Json<MoveAssetRequest>) -> Json<ApiResult<()>> {
    //Parse template_id to uuid
    let template_id = match Uuid::parse_str(&template_id){
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };
    let base_path = format!("data/templates/{}/assets", template_id);
    let base_path = Path::new(&base_path).canonicalize().unwrap();
    
    let old_path = match safe_path_combine(&base_path.to_str().unwrap(), &asset.old_path){
        Ok(path) => path,
        Err(_) => {
            eprintln!("Error moving asset, invalid path.");
            return ApiResult::new_error(ApiError::BadRequest("Invalid path".to_string()));
        }
    };

    let new_path = match safe_path_combine(&base_path.to_str().unwrap(), &asset.new_path){
        Ok(path) => path,
        Err(_) => {
            eprintln!("Error moving asset, invalid path.");
            return ApiResult::new_error(ApiError::BadRequest("Invalid path".to_string()));
        }
    };

    // Move the asset
    let res = tokio::task::spawn_blocking(move || {
        if !asset.overwrite{
            // Check if file already exists
            if new_path.exists(){
                return ApiResult::new_error(ApiError::Conflict("Target path already exists".to_string()));
            }
        }
        
        match fs::rename(&old_path, &new_path){
            Ok(_) => ApiResult::new_data(()),
            Err(_) => {
                eprintln!("Error moving asset, invalid path.");
                ApiResult::new_error(ApiError::InternalServerError)
            }
        }
    }).await;

    match res {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Error moving asset: {}", e);
            ApiResult::new_error(ApiError::InternalServerError)
        }
    }

}

#[post("/api/templates/<template_id>/export_formats", data = "<data>")]
pub async fn add_export_format(_session: Session, template_id: String, data_storage: &State<Arc<DataStorage>>, data: Json<ExportFormat>) -> Json<ApiResult<ExportFormat>>{

    // Clone data storage
    let mut data_storage = data_storage.clone();

    let template_id = match Uuid::parse_str(&template_id) {
        Ok(template_id) => template_id,
        Err(e) => {
            eprintln!("Couldn't parse template id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        }
    };

    // Get the format to be added
    let format = data.into_inner();

    // Add folder in file system
    let base_path = format!("data/templates/{}/formats", template_id);
    let base_path = Path::new(&base_path).canonicalize().unwrap();

    let new_path = match safe_path_combine(&base_path.to_str().unwrap(), &format.slug){
        Ok(path) => path,
        Err(_) => {
            eprintln!("Error creating export Format, invalid slug.");
            return ApiResult::new_error(ApiError::BadRequest("Invalid Slug".to_string()));
        }
    };

    if new_path.exists(){
        return ApiResult::new_error(ApiError::BadRequest("An export format with this slug already exists.".to_string()))
    }

    let template_exists;
    {
        // Here we're assuming exported_formats is locked with a Mutex
        let lock = data_storage.data.read().unwrap();
        template_exists = match lock.templates.get(&template_id){
            Some(template) => {
                template.write().unwrap().export_formats.push(format.clone());
                true
            },
            None => {
                false
            }
        };
    }

    if !template_exists {
        return ApiResult::new_error(ApiError::NotFound)
    }

    match tokio::fs::create_dir_all(new_path).await{
        Ok(_) => ApiResult::new_data(format),
        Err(e) => {
            eprintln!("Couldn't create folder for new export format: {}", e);
            ApiResult::new_error(ApiError::InternalServerError)
        }
    }
}
#[derive(serde::Deserialize)]
pub struct MoveAssetRequest {
    pub overwrite: bool,
    pub old_path: String,
    pub new_path: String,
}
