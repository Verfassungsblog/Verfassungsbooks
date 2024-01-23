use rocket::serde::json::Json;
use std::sync::Arc;
use bincode::{Decode, Encode};
use chrono::NaiveDateTime;
use rocket::State;
use serde_derive::{Deserialize, Serialize};
use crate::data_storage::ProjectStorage;
use crate::projects::{Identifier, Keyword, Language, License, ProjectMetadata, ProjectSettings};
use crate::session::session_guard::Session;
use crate::settings::Settings;

/// Api Endpoints for the project editor

/// GET /api/projects/<project_id>/metadata
///     Returns the metadata of the project
/// GET /api/projects/<project_id>/settings
///     Returns the settings of the project
/// GET /api/projects/<project_id>/contents
///     Returns a list of all contents (sections or toc placeholder) in the project
/// GET /api/projects/<project_id>/sections/<section_id>
///     Returns a section

#[derive(Serialize, Deserialize)]
pub struct ApiResult<T> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

#[derive(Serialize, Deserialize)]
pub enum ApiError{
    NotFound,
    BadRequest(String),
    Unauthorized,
    Other(String),
}

impl<T> ApiResult<T>{
    pub fn new_error(error: ApiError) -> Json<ApiResult<T>> {
        Json(Self {
            error: Some(error),
            data: None,
        })
    }
    pub fn new_data(data: T) -> Json<ApiResult<T>> {
        Json(Self {
            error: None,
            data: Some(data),
        })
    }
}

#[get("/api/projects/<project_id>/metadata")]
pub async fn get_project_metadata(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Option<ProjectMetadata>>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let metadata = project_entry.read().unwrap().metadata.clone();

    ApiResult::new_data(metadata)

}

trait Patch<P, T>{
    fn patch(&mut self, patch: P) -> T;
}

impl Patch<PatchProjectMetadata, ProjectMetadata> for ProjectMetadata{
    fn patch(&mut self, patch: PatchProjectMetadata) -> ProjectMetadata{
        let mut new_metadata = self.clone();

        if let Some(title) = patch.title{
            new_metadata.title = title;
        }

        if let Some(subtitle) = patch.subtitle{
            new_metadata.subtitle = subtitle;
        }

        if let Some(authors) = patch.authors{
            new_metadata.authors = authors;
        }

        if let Some(editors) = patch.editors{
            new_metadata.editors = editors;
        }

        if let Some(web_url) = patch.web_url{
            new_metadata.web_url = web_url;
        }

        if let Some(identifiers) = patch.identifiers{
            new_metadata.identifiers = identifiers;
        }

        if let Some(published) = patch.published{
            new_metadata.published = published;
        }

        if let Some(languages) = patch.languages{
            new_metadata.languages = languages;
        }

        if let Some(number_of_pages) = patch.number_of_pages{
            new_metadata.number_of_pages = number_of_pages;
        }

        if let Some(short_abstract) = patch.short_abstract{
            new_metadata.short_abstract = short_abstract;
        }

        if let Some(long_abstract) = patch.long_abstract{
            new_metadata.long_abstract = long_abstract;
        }

        if let Some(keywords) = patch.keywords{
            new_metadata.keywords = keywords;
        }

        if let Some(ddc) = patch.ddc{
            new_metadata.ddc = ddc;
        }

        if let Some(license) = patch.license{
            new_metadata.license = license;
        }

        if let Some(series) = patch.series{
            new_metadata.series = series;
        }

        if let Some(volume) = patch.volume{
            new_metadata.volume = volume;
        }

        if let Some(edition) = patch.edition{
            new_metadata.edition = edition;
        }

        if let Some(publisher) = patch.publisher{
            new_metadata.publisher = publisher;
        }

        new_metadata
    }
}

#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq, Default)]
pub struct PatchProjectMetadata{
    /// Book Title
    pub title: Option<String>,
    /// Subtitle of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub subtitle: Option<Option<String>>,
    /// List of ids of authors of the book
    #[bincode(with_serde)]
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub authors: Option<Option<Vec<uuid::Uuid>>>,
    /// List of ids of editors of the book
    #[bincode(with_serde)]
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub editors: Option<Option<Vec<uuid::Uuid>>>,
    /// URL to a web version of the book or reference
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub web_url: Option<Option<String>>,
    /// List of identifiers of the book (e.g. ISBNs)
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub identifiers: Option<Option<Vec<Identifier>>>,
    /// Date of publication
    #[bincode(with_serde)]
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub published: Option<Option<NaiveDateTime>>,
    /// Languages of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub languages: Option<Option<Vec<Language>>>,
    /// Number of pages of the book (should be automatically calculated)
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub number_of_pages: Option<Option<u32>>,
    /// Short abstract of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub short_abstract: Option<Option<String>>,
    /// Long abstract of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub long_abstract: Option<Option<String>>,
    /// Keywords of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub keywords: Option<Option<Vec<Keyword>>>,
    /// Dewey Decimal Classification (DDC) classes (subject groups)
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub ddc: Option<Option<String>>,
    /// License of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub license: Option<Option<License>>,
    /// Series the book belongs to
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub series: Option<Option<String>>,
    /// Volume of the book in the series
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub volume: Option<Option<String>>,
    /// Edition of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub edition: Option<Option<String>>,
    /// Publisher of the book
    #[serde(default, skip_serializing_if = "Option::is_none", with = "::serde_with::rust::double_option")]
    pub publisher: Option<Option<String>>
}

#[post("/api/projects/<project_id>/metadata", data = "<metadata>")]
pub async fn set_project_metadata(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, metadata: Json<ProjectMetadata>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    project.metadata = Some(metadata.into_inner());

    ApiResult::new_data(())
}

#[patch("/api/projects/<project_id>/metadata", data = "<metadata>")]
pub async fn patch_project_metadata(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, metadata: Json<PatchProjectMetadata>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };


    let mut old_metadata = match &project_entry.read().unwrap().metadata{
        Some(metadata) => metadata.clone(),
        None => {
            ProjectMetadata::default()
        }
    };

    let new_metadata = old_metadata.patch(metadata.into_inner());

    let mut project = project_entry.write().unwrap();

    project.metadata = Some(new_metadata);

    ApiResult::new_data(())
}

#[get("/api/projects/<project_id>/settings")]
pub async fn get_project_settings(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Option<ProjectSettings>>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let settings = project_entry.read().unwrap().settings.clone();

    ApiResult::new_data(settings)
}

#[post("/api/projects/<project_id>/settings", data = "<project_settings>")]
pub async fn set_project_settings(project_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>, project_settings: Json<ProjectSettings>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    project.settings = Some(project_settings.into_inner());

    ApiResult::new_data(())
}

/// PUT /api/projects/<project_id>/metadata/authors/<author_id>
/// Add person as author to project
#[put("/api/projects/<project_id>/metadata/authors/<author_id>")]
pub async fn add_author_to_project(project_id: String, author_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let author_id = match uuid::Uuid::parse_str(&author_id) {
        Ok(author_id) => author_id,
        Err(e) => {
            eprintln!("Couldn't parse author id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse author id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        let new_metadata: ProjectMetadata = Default::default();
        project.metadata = Some(new_metadata);
    }

    if let None = project.metadata.as_ref().unwrap().authors{
        project.metadata.as_mut().unwrap().authors = Some(Vec::new());
    }

    if !project.metadata.as_ref().unwrap().authors.as_ref().unwrap().contains(&author_id){
        project.metadata.as_mut().unwrap().authors.as_mut().unwrap().push(author_id);
    }

    ApiResult::new_data(())
}

/// PUT /api/projects/<project_id>/metadata/editors/<editor_id>
/// Add person as editor to project
#[put("/api/projects/<project_id>/metadata/editors/<editor_id>")]
pub async fn add_editor_to_project(project_id: String, editor_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let editor_id = match uuid::Uuid::parse_str(&editor_id) {
        Ok(editor_id) => editor_id,
        Err(e) => {
            eprintln!("Couldn't parse editor id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse editor id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        let new_metadata: ProjectMetadata = Default::default();
        project.metadata = Some(new_metadata);
    }

    if let None = project.metadata.as_ref().unwrap().editors{
        project.metadata.as_mut().unwrap().editors = Some(Vec::new());
    }

    if !project.metadata.as_ref().unwrap().editors.as_ref().unwrap().contains(&editor_id){
        project.metadata.as_mut().unwrap().editors.as_mut().unwrap().push(editor_id);
    }

    ApiResult::new_data(())
}

/// DELETE /api/projects/<project_id>/metadata/authors/<author_id>
/// Remove person from project as author
#[delete("/api/projects/<project_id>/metadata/authors/<author_id>")]
pub async fn remove_author_from_project(project_id: String, author_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let author_id = match uuid::Uuid::parse_str(&author_id) {
        Ok(author_id) => author_id,
        Err(e) => {
            eprintln!("Couldn't parse author id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse author id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let None = project.metadata.as_ref().unwrap().authors{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let Some(index) = project.metadata.as_ref().unwrap().authors.as_ref().unwrap().iter().position(|x| *x == author_id){
        project.metadata.as_mut().unwrap().authors.as_mut().unwrap().remove(index);
    }

    ApiResult::new_data(())
}

/// DELETE /api/projects/<project_id>/metadata/editors/<editor_id>
/// Remove person from project as editor
#[delete("/api/projects/<project_id>/metadata/editors/<editor_id>")]
pub async fn remove_editor_from_project(project_id: String, editor_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let editor_id = match uuid::Uuid::parse_str(&editor_id) {
        Ok(editor_id) => editor_id,
        Err(e) => {
            eprintln!("Couldn't parse author id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse editor id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry.clone(),
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let None = project.metadata.as_ref().unwrap().editors{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let Some(index) = project.metadata.as_ref().unwrap().editors.as_ref().unwrap().iter().position(|x| *x == editor_id){
        project.metadata.as_mut().unwrap().editors.as_mut().unwrap().remove(index);
    }else{
        return ApiResult::new_error(ApiError::NotFound);
    }

    ApiResult::new_data(())
}

/// PUT /api/projects/<project_id>/metadata/keywords
/// Add keyword to project
#[put("/api/projects/<project_id>/metadata/keywords", data = "<keyword>")]
pub async fn add_keyword_to_project(project_id: String, keyword: Json<Keyword>, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry,
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        let new_metadata: ProjectMetadata = Default::default();
        project.metadata = Some(new_metadata);
    }

    if let None = project.metadata.as_ref().unwrap().keywords{
        project.metadata.as_mut().unwrap().keywords = Some(Vec::new());
    }

    if !project.metadata.as_ref().unwrap().keywords.as_ref().unwrap().contains(&keyword){
        project.metadata.as_mut().unwrap().keywords.as_mut().unwrap().push(keyword.into_inner());
    }

    ApiResult::new_data(())
}

/// DELETE /api/projects/<project_id>/metadata/keywords/<keyword>
/// Remove keyword from project
#[delete("/api/projects/<project_id>/metadata/keywords/<keyword>")]
pub async fn remove_keyword_from_project(project_id: String, keyword: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry,
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let None = project.metadata.as_ref().unwrap().keywords{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let Some(index) = project.metadata.as_ref().unwrap().keywords.as_ref().unwrap().iter().position(|x| *x.title == keyword){
        project.metadata.as_mut().unwrap().keywords.as_mut().unwrap().remove(index);
    }else{
        return ApiResult::new_error(ApiError::NotFound);
    }

    ApiResult::new_data(())
}

/// POST /api/projects/<project_id>/metadata/identifiers/
/// Add identifier to project
#[post("/api/projects/<project_id>/metadata/identifiers", data = "<identifier>")]
pub async fn add_identifier_to_project(project_id: String, mut identifier: Json<Identifier>, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<Identifier>> {
    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    if let None = identifier.id{
        identifier.id = Some(uuid::Uuid::new_v4());
    }else{
        return ApiResult::new_error(ApiError::BadRequest("Identifier is not supposed to have an id.".to_string()));
    }

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry,
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();

    if let None = project.metadata{
        let new_metadata: ProjectMetadata = Default::default();
        project.metadata = Some(new_metadata);
    }

    if let None = project.metadata.as_ref().unwrap().identifiers{
        project.metadata.as_mut().unwrap().identifiers = Some(Vec::new());
    }

    if !project.metadata.as_ref().unwrap().identifiers.as_ref().unwrap().contains(&identifier){
        project.metadata.as_mut().unwrap().identifiers.as_mut().unwrap().push(identifier.clone().into_inner());
    }

    ApiResult::new_data(identifier.into_inner())
}

/// DELETE /api/projects/<project_id>/metadata/identifiers/<identifier_ic>
/// Remove identifier
#[delete("/api/projects/<project_id>/metadata/identifiers/<identifier_id>")]
pub async fn remove_identifier_from_project(project_id: String, identifier_id: String, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {
    let identifier_id = match uuid::Uuid::parse_str(&identifier_id) {
        Ok(identifier_id) => identifier_id,
        Err(e) => {
            eprintln!("Couldn't parse identifier id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse identifier id".to_string()));
        },
    };

    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry,
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();
    if let None = project.metadata{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let None = project.metadata.as_ref().unwrap().identifiers{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let Some(index) = project.metadata.as_ref().unwrap().identifiers.as_ref().unwrap().iter().position(|x| x.id.unwrap_or_default() == identifier_id){
        project.metadata.as_mut().unwrap().identifiers.as_mut().unwrap().remove(index);
        ApiResult::new_data(())
    }else{
        ApiResult::new_error(ApiError::NotFound)
    }
}

/// PUT /api/projects/<project_id>/metadata/identifiers/<identifier_id>
/// Update identifier
#[put("/api/projects/<project_id>/metadata/identifiers/<identifier_id>", data = "<identifier>")]
pub async fn update_identifier_in_project(project_id: String, identifier_id: String, identifier: Json<Identifier>, _session: Session, settings: &State<Settings>, project_storage: &State<Arc<ProjectStorage>>) -> Json<ApiResult<()>> {

    let identifier_id = match uuid::Uuid::parse_str(&identifier_id) {
        Ok(identifier_id) => identifier_id,
        Err(e) => {
            eprintln!("Couldn't parse identifier id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse identifier id".to_string()));
        },
    };

    let mut identifier = identifier.into_inner();

    if let Some(id) = identifier.id{
        if id != identifier_id{
            return ApiResult::new_error(ApiError::BadRequest("Identifier id in url and body don't match".to_string()));
        }
    }else{
        identifier.id = Some(identifier_id);
    }

    let project_id = match uuid::Uuid::parse_str(&project_id) {
        Ok(project_id) => project_id,
        Err(e) => {
            eprintln!("Couldn't parse project id: {}", e);
            return ApiResult::new_error(ApiError::BadRequest("Couldn't parse project id".to_string()));
        },
    };

    let project_storage = Arc::clone(project_storage);

    let project_entry = match project_storage.get_project(&project_id, settings).await{
        Ok(project_entry) => project_entry,
        Err(_) => {
            eprintln!("Couldn't get project with id {}", project_id);
            return ApiResult::new_error(ApiError::NotFound);
        },
    };

    let mut project = project_entry.write().unwrap();
    if let None = project.metadata{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let None = project.metadata.as_ref().unwrap().identifiers{
        return ApiResult::new_error(ApiError::NotFound);
    }

    if let Some(index) = project.metadata.as_ref().unwrap().identifiers.as_ref().unwrap().iter().position(|x| x.id.unwrap_or_default() == identifier_id){
        project.metadata.as_mut().unwrap().identifiers.as_mut().unwrap()[index] = identifier;
        ApiResult::new_data(())
    }else{
        ApiResult::new_error(ApiError::NotFound)
    }
}