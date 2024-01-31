use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, RwLock, RwLockWriteGuard};
use std::sync::atomic::AtomicBool;
use std::time::SystemTime;
use serde::{Deserialize, Serialize};
use bincode::{Encode, Decode};
use crate::projects::{Person, ProjectMetadata, ProjectSettings, Section, SectionContent, SectionOrToc};
use crate::projects::api::ApiError;
use crate::settings::Settings;

/// Storage for small data like users, passwords and login attempts
///
/// This data is stored in memory permanently and doesn't get unloaded
pub struct DataStorage{
    pub data: RwLock<InnerDataStorage>,
    file_locked: AtomicBool,
}

#[derive(Debug, Serialize, Deserialize, Encode, Decode, Clone)]
pub struct InnerDataStorage{
    /// Contains users, passwords and login attempts
    #[bincode(with_serde)]
    pub login_data: HashMap<String, Arc<RwLock<User>>>,
    #[bincode(with_serde)]
    pub persons: HashMap<uuid::Uuid, Arc<RwLock<Person>>>,
    #[bincode(with_serde)]
    pub templates: HashMap<uuid::Uuid, Arc<RwLock<ProjectTemplate>>>
}

impl DataStorage{
    /// Creates a new empty [DataStorage]
    pub fn new() -> Self {
        DataStorage {
            data: RwLock::new(InnerDataStorage{
                login_data: Default::default(),
                persons: Default::default(),
                templates: Default::default(),
            }),
            file_locked: Default::default(),
        }
    }

    pub async fn insert_template(&mut self, template: ProjectTemplate, settings: &Settings) -> Result<(), ()>{
        // Create template directory inside data if it doesn't exist
        if !Path::new(&format!("{}/templates/{}", settings.data_path, template.id)).exists(){
            if let Err(e) =  tokio::fs::create_dir_all(&format!("{}/templates/{}", settings.data_path, template.id)).await{
                eprintln!("error while creating template directory: {}", e);
                return Err(())
            }
        }
        self.data.write().unwrap().templates.insert(template.id.clone(), Arc::new(RwLock::new(template)));
        self.save_to_disk(settings).await?;
        Ok(())
    }

    /// inserts a new user into the [DataStorage]
    pub async fn insert_user(&mut self, user: User, settings: &Settings) -> Result<(), ()>{
        self.data.write().unwrap().login_data.insert(user.email.clone(), Arc::new(RwLock::new(user)));
        self.save_to_disk(settings).await?;
        Ok(())
    }

    /// returns a user from the [DataStorage] as [Arc<RwLock<User>>]
    pub fn get_user(&self, email: &String) -> Result<Arc<RwLock<User>>, ()>{
        match self.data.read().unwrap().login_data.get(email){
            None => Err(()),
            Some(data) => Ok(data.clone())
        }
    }

    /// Check if user exists
    pub fn person_exists(&self, uuid: &uuid::Uuid) -> bool{
        self.data.read().unwrap().persons.contains_key(uuid)
    }

    /// Loads the [DataStorage] from disk
    ///
    /// Path is defined as data_path from settings + /data.bincode
    pub async fn load_from_disk(settings: &Settings) -> Result<Self, ()>{
        let mut data_storage = DataStorage::new();
        let path = format!("{}/data.bincode", settings.data_path);

        let res = rocket::tokio::task::spawn_blocking(move || {
            let mut file = match std::fs::File::open(path) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("io error while loading data_storage file into memory: {}", e);
                    return Err(())
                },
            };
            match bincode::decode_from_std_read(&mut file, bincode::config::standard()) {
                Ok(project) => Ok(project),
                Err(e) => {
                    eprintln!("bincode decode error while loading project file into memory: {}. Check if the saved data needs migration.", e);
                    Err(())
                },
            }
        }).await;

        match res {
            Ok(data) => {
                match data{
                    Ok(data) => {
                        data_storage.data = RwLock::new(data);
                        Ok(data_storage)
                    },
                    Err(_) => {
                        return Err(())
                    }
                }
            },
            Err(_) => {
                Err(())
            }
        }
    }

    /// Saves the [DataStorage] to disk
    ///
    /// Creates a whole copy of the [DataStorage] and saves it to disk
    /// This may use a lot of memory, maybe change this in the future if it becomes a problem
    pub async fn save_to_disk(&self, settings: &Settings) -> Result<(), ()>{
        self.wait_for_file_lock(settings).await?;

        // Save login data
        let cpy = self.data.read().unwrap().clone();
        let path = format!("{}/data.bincode", settings.data_path);

        match rocket::tokio::task::spawn_blocking(move || {
            let mut file = match std::fs::File::create(path) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("io error while saving data to disk: {}", e);
                    return Err(())
                },
            };

            return match bincode::encode_into_std_write(cpy, &mut file, bincode::config::standard()) {
                Ok(_) => Ok(()),
                Err(e) => {
                    eprintln!("bincode encode error while saving data to disk: {}", e);
                    Err(())
                },
            }
        }).await{
            Ok(res) => res?,
            Err(e) => {
                eprintln!("error while saving data to disk: {}", e);
                return Err(())
            }
        };

        self.remove_file_lock();
        Ok(())
    }
}

impl SingleFileLock for DataStorage{
    fn get_file_lock(&self) -> &AtomicBool {
        &self.file_locked
    }
}

/// Trait for data structures that need to handle multiple file locks
///
/// Struct needs to implement [MultipleFileLocks::get_file_lock_entry]
#[async_trait]
pub trait MultipleFileLocks{
    /// Returns an [AtomicBool] that is used as file lock for the given uuid
    fn get_file_lock_entry(&self, uuid: &uuid::Uuid) -> Arc<AtomicBool>;
    /// Creates a file lock for the given uuid
    fn create_file_lock(&self, uuid: &uuid::Uuid) -> Result<(), ()> {
        if self.get_file_lock_entry(uuid).load(std::sync::atomic::Ordering::SeqCst) {
            // file already locked
            Err(())
        }else{
            // file not locked, lock it
            self.get_file_lock_entry(uuid).store(true, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        }
    }
    fn remove_file_lock(&self, uuid: &uuid::Uuid){
        self.get_file_lock_entry(uuid).store(false, std::sync::atomic::Ordering::SeqCst);
    }

    async fn wait_for_file_lock(&self, uuid: &uuid::Uuid, settings: &Settings) -> Result<(), ()>{
        let mut time_waited = 0;
        while self.create_file_lock(uuid).is_err() {
            time_waited += 10;
            if time_waited > settings.file_lock_timeout {
                eprintln!("error while waiting for file lock: waiting for file lock timed out. Waited for {} ms, exceeding the configured limit.", time_waited);
                return Err(())
            }

            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        }

        Ok(())
    }
}

#[async_trait]
pub trait SingleFileLock {
    fn get_file_lock(&self) -> &AtomicBool;

    fn create_file_lock(& self) -> Result<(), ()> {
        if self.get_file_lock().load(std::sync::atomic::Ordering::SeqCst) {
            // file already locked
            Err(())
        } else {
            // file not locked, lock it
            self.get_file_lock().store(true, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        }
    }

    fn remove_file_lock(&self){
        self.get_file_lock().store(false, std::sync::atomic::Ordering::SeqCst);
    }

    async fn wait_for_file_lock(&self, settings: &Settings) -> Result<(), ()>{
        let mut time_waited = 0;
        while self.create_file_lock().is_err() {
            time_waited += 10;
            if time_waited > settings.file_lock_timeout {
                eprintln!("error while waiting for file lock: waiting for file lock timed out. Waited for {} ms, exceeding the configured limit.", time_waited);
                return Err(())
            }

            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        }

        Ok(())
    }
}


/// Storage for all projects, gets build on startup based on project files in data_path
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStorage {
    /// HashMap with project uuid and project data if project is already loaded into memory
    pub projects: RwLock<HashMap<uuid::Uuid, ProjectStorageEntry>>,
    pub file_locks: RwLock<HashMap<uuid::Uuid, Arc<AtomicBool>>>,
}

#[derive(Debug, Serialize, Deserialize, Encode, Decode, Clone)]
pub struct ProjectStorageEntry{
    pub name: String,
    pub data: Option<Arc<RwLock<ProjectData>>>,
}

impl MultipleFileLocks for ProjectStorage{
    fn get_file_lock_entry(&self, uuid: &uuid::Uuid) -> Arc<AtomicBool> {
        if let Some(entry) =  self.file_locks.read().unwrap().get(uuid){
            return entry.clone()
        }
        // Create new entry
        self.file_locks.write().unwrap().insert(uuid.clone(), Arc::new(AtomicBool::new(false)));
        return self.file_locks.read().unwrap().get(uuid).unwrap().clone()
    }
}

impl ProjectStorage {
    /// Creates a new empty [ProjectStorage]
    pub fn new() -> Self {
        ProjectStorage {
            projects: RwLock::new(HashMap::new()),
            file_locks: Default::default(),
        }
    }

    /// Unloads all unused projects from memory
    ///
    /// Checks if projects last interaction time is older than project_cache_time defined in config
    /// Saves the project to disk before unloading it
    pub async fn unload_unused_projects(&mut self, settings: &Settings) -> Result<(), ()>{
        let mut projects_to_unload = vec![];

        for (uuid, project_data) in self.projects.read().unwrap().iter(){
            if let Some(project) = &project_data.data{
                let now =  SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                if Arc::strong_count(&project) == 1 && project.read().unwrap().last_interaction + settings.project_cache_time < now{
                    projects_to_unload.push(uuid.clone());
                }
            }
        }

        for project in projects_to_unload{
            self.save_project_to_disk(&project, settings).await?;
            self.unload_project(&project)?;
        }

        Ok(())
    }

    /// Unloads a project from memory
    ///
    /// Does not save the project to disk, use [ProjectStorage::save_project_to_disk] for that
    fn unload_project(&self, uuid: &uuid::Uuid) -> Result<(), ()>{
        match self.projects.write().unwrap().get_mut(uuid){
            Some(project) => {
                project.data = None;
                println!("Unloaded project {} from memory.", uuid);
                Ok(())
            },
            None => {
                eprintln!("Requested to unload project {}, but no project exists.", uuid);
                Err(())
            },
        }
    }

    /// Loads a list of all projects from the projects directory inside the data_path
    /// Does not load the projects into memory
    ///
    /// # Returns
    /// * `ProjectStorage` - [ProjectStorage] with all projects uuids and None as project data
    pub async fn load_from_directory(&self, settings: &Settings) -> Result<(), ()> {
        // Get all project uuids
        let paths = match std::fs::read_dir(format!("{}/projects/", settings.data_path)) {
            Ok(paths) => paths,
            Err(e) => {
                eprintln!("io error while loading project directory: {}. Check that your data_path is set correctly and we have sufficient file permissions.", e);
                return Err(())
            }
        };

        for path in paths {
            match path {
                Ok(entry) => {
                    match entry.file_name().to_str() {
                        Some(uuid) => {
                            let uuid = uuid.replace(".bincode", "");
                            match uuid.parse::<uuid::Uuid>() {
                                Ok(uuid) => {
                                    println!("Loading project {}.", uuid);
                                    match self.load_project_into_memory(&uuid, settings).await{
                                        Ok(_) => {
                                            println!("Successfully loaded project {} into memory.", uuid);
                                            if let Err(_) = self.unload_project(&uuid){
                                                eprintln!("error while unloading project {} after loading it into memory. Skipping project.", uuid);
                                                continue
                                            }
                                            println!("Project storage now contains: {:?}", self.projects.read().unwrap().keys());
                                        },
                                        Err(_) => {
                                            eprintln!("error while loading project {} into memory. Skipping project.", uuid);
                                            continue
                                        }
                                    }
                                },
                                Err(e) => {
                                    eprintln!("error while parsing project directory entry name into uuid: {}, Skipping project.", e);
                                    continue
                                }
                            }
                        },
                        None => {
                            eprintln!("error while parsing project directory entry: {:?}, Skipping project.", entry.file_name());
                            continue
                        }
                    };
                }
                Err(e) => {
                    eprintln!("io error while loading project directory entry: {}, Skipping project.", e);
                    continue
                }
            }
        }

        Ok(())
    }

    /// Insert new project into [ProjectStorage]
    ///
    /// Also calls [ProjectStorage::save_project_to_disk] to save the project to disk
    ///
    /// # Arguments
    /// * `project` - [ProjectData] - Project to insert
    ///
    /// # Returns
    /// * `Ok(uuid::Uuid)` - Project inserted successfully - returns the generated [uuid::Uuid] of the project
    pub async fn insert_project(&self, mut project: ProjectData, settings: &Settings) -> Result<uuid::Uuid, ()> {
        let uuid = uuid::Uuid::new_v4();

        // Update last edited to current time, so the project doesn't get unloaded immediately
        project.last_interaction = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
        let entry = ProjectStorageEntry{
            name: project.name.clone(),
            data: Some(Arc::new(RwLock::new(project))),
        };
        self.projects.write().unwrap().insert(uuid,entry);
        self.save_project_to_disk(&uuid, settings).await?;
        Ok(uuid)
    }

    async fn load_project_into_memory(&self, uuid: &uuid::Uuid, settings: &Settings) -> Result<(), ()> {

        // Try to load project file from disk
        let path = format!("{}/projects/{}.bincode", settings.data_path, uuid);

        println!("Aquiring file lock for project {}.", uuid);
        match self.wait_for_file_lock(uuid, settings).await{
            Ok(_) => {},
            Err(_) => {
                eprintln!("error while saving project to disk: couldn't get file lock");
                return Err(())
            }
        }

        println!("Loading project {} into memory.", uuid);

        let res = rocket::tokio::task::spawn_blocking(move || {
            let mut file = match std::fs::File::open(path) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("io error while loading project file into memory: {}", e);
                    return Err(())
                },
            };
            match bincode::decode_from_std_read(&mut file, bincode::config::standard()) {
                Ok(project) => Ok(project),
                Err(e) => {
                    eprintln!("bincode decode error while loading project file into memory: {}", e);
                    Err(())
                },
            }
        }).await;

        println!("Read complete. Releasing file lock for project {}.", uuid);

        self.remove_file_lock(uuid);

        println!("File lock released for project {}.", uuid);

        match res{
            Ok(project) => {
                match project {
                    Ok(project) => {
                        println!("Loaded project, inserting into memory storage.");
                        if let Some(tproject) = self.projects.write().unwrap().get_mut(uuid){
                                // Update last edited to current time, so the project doesn't get unloaded immediately
                                let mut project: ProjectData = project;
                                project.last_interaction = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                                tproject.name = project.name.clone();
                                println!("Replacing project");
                                tproject.data.replace(Arc::new(RwLock::new(project)));
                                println!("Inserted project into memory storage.");
                                return Ok(())
                        }

                        println!("Project not found in memory storage, creating new entry.");
                        let entry = ProjectStorageEntry{
                            name: project.name.clone(),
                            data: Some(Arc::new(RwLock::new(project))),
                        };
                        self.projects.write().unwrap().insert(uuid.clone(), entry);
                        println!("Created new entry in memory storage.");
                        Ok(())
                    },
                    Err(_) => Err(()),
                }
            },
            Err(e) => {
                eprintln!("error while loading project file into memory: {}", e);
                Err(())
            }
        }
    }

    pub async fn get_project(&self, uuid: &uuid::Uuid, settings: &Settings) -> Result<Arc<RwLock<ProjectData>>, ()> {
        // Check if project exists
        match self.projects.read().unwrap().get(uuid) {
            Some(project) => {
                if let Some(project) = &project.data {
                    project.write().unwrap().last_interaction = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                    return Ok(Arc::clone(project));
                }
            },
            None => return Err(()),
        }

        // Project doesn't exist in memory, try to load from disk
        self.load_project_into_memory(uuid, settings).await?;

        // Check if project exists
        match self.projects.read().unwrap().get(uuid) {
            Some(project) => {
                match &project.data {
                    None => {
                        //Still no project in memory, couldn't load from disk
                        Err(())
                    }
                    Some(project) => {
                        // Update last interaction time, so the project doesn't get unloaded immediately
                        project.write().unwrap().last_interaction = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                        Ok(Arc::clone(project))
                    },
                }
            },
            None => return Err(()),
        }
    }

    async fn save_project_to_disk(&self, uuid: &uuid::Uuid, settings: &Settings) -> Result<(), ()> {
        // Get project
        let project = match self.projects.read().unwrap().get(&uuid) {
            Some(project) => {
                match &project.data {
                    Some(project) => project.clone(),
                    None => return Err(()),
                }
            },
            None => return Err(()),
        };
        // Encode project data with bincode and save to disk
        let path = format!("{}/projects/{}.bincode", settings.data_path, uuid);

        match self.wait_for_file_lock(&uuid, settings).await{
            Ok(_) => {},
            Err(_) => {
                eprintln!("error while saving project to disk: couldn't get file lock");
                return Err(())
            }
        }

        let res = rocket::tokio::task::spawn_blocking(move || {
            let mut file = match std::fs::File::create(path) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("io error while saving project to disk: {}", e);
                    return Err(())
                },
            };
            // Clone project data to avoid locking the project while saving
            let pcopy = project.read().unwrap().clone();
            match bincode::encode_into_std_write(&pcopy, &mut file, bincode::config::standard()) {
                Ok(_) => Ok(()),
                Err(e) => {
                    eprintln!("bincode encode error while saving project to disk: {}", e);
                    Err(())
                },
            }
        }).await;

        self.remove_file_lock(uuid);
        match res{
            Ok(_) => Ok(()),
            Err(e) => {
                eprintln!("error while saving project to disk: {}", e);
                Err(())
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Encode, Decode, Clone, PartialEq)]
pub struct ProjectData{
    pub name: String,
    pub description: Option<String>,
    #[bincode(with_serde)]
    pub template_id: uuid::Uuid,
    pub last_interaction: u64,
    pub metadata: Option<ProjectMetadata>,
    pub settings: Option<ProjectSettings>,
    pub sections: Vec<SectionOrToc>,
}

impl ProjectData{
    pub fn remove_section(&mut self, section_to_remove_id: &uuid::Uuid) -> Option<Section> {
        let pos = self.sections.iter().position(|section| match section {
            SectionOrToc::Section(section) => section.id == Some(*section_to_remove_id),
            _ => false,
        });

        match pos {
            Some(pos) => self.sections.remove(pos).into_section(),
            None => {
                for section in &mut self.sections {
                    if let SectionOrToc::Section(section) = section {
                        if let Some(removed) = section.remove_child_section(section_to_remove_id) {
                            return Some(removed);
                        }
                    }
                }
                None
            }
        }
    }
    pub fn insert_section_as_first_child(&mut self, parent_section_id: &uuid::Uuid, section_to_insert: Section) -> Result<(), ()> {
        for section in &mut self.sections {
            if let SectionOrToc::Section(section) = section {
                // Check if this is the parent section
                if section.id == Some(*parent_section_id) {
                    section.children.insert(0, SectionContent::Section(section_to_insert));
                    return Ok(());
                }else{
                    // Check if one of the children is the parent section
                    if let Some(_) = section.insert_child_section_as_child(parent_section_id, &section_to_insert) {
                        return Ok(());
                    }
                }
            }
        }
        Err(())
    }
    pub fn insert_section_after(&mut self, previous_element: &uuid::Uuid, section_to_insert: Section) -> Result<(), ()> {
        let pos = self.sections.iter().position(|section| match section {
            SectionOrToc::Section(section) => section.id == Some(*previous_element),
            _ => false,
        });

        match pos {
            Some(pos) => {
                self.sections.insert(pos + 1, SectionOrToc::Section(section_to_insert));
                Ok(())
            }
            None => {
                for section in &mut self.sections {
                    if let SectionOrToc::Section(section) = section {
                        if let Some(_) = section.insert_child_section_after(previous_element, &section_to_insert) {
                            return Ok(());
                        }
                    }
                }
                Err(())
            }
        }
    }
}

pub fn get_section_by_path_mut<'a>(
    project: &'a mut RwLockWriteGuard<ProjectData>,
    path: &Vec<uuid::Uuid>
) -> Result<&'a mut Section, ApiError> {

    // Find first section
    let first_section_opt = project.sections.iter_mut()
        .find_map(|section| {
            if let SectionOrToc::Section(section) = section {
                if section.id.unwrap_or_default() == path[0] {
                    Some(section)
                } else {
                    None
                }
            } else {
                None
            }
        });

    // Return error if no first section found
    let mut current_section = first_section_opt
        .ok_or_else(|| {
            println!("Couldn't find section with id {}", path[0]);
            ApiError::NotFound
        })?;

    // Iterate through the path
    for &part in path.iter().skip(1) {
        let mut found_section = None;

        for child in &mut current_section.children {
            if let SectionContent::Section(section) = child {
                if section.id.unwrap_or_default() == part {
                    found_section = Some(section);
                    break;
                }
            }
        }

        match found_section {
            Some(section) => {
                current_section = section;
            },
            None => {
                println!("Couldn't find section with id {}", part);
                return Err(ApiError::NotFound);
            }
        }
    }

    Ok(current_section)
}

pub fn get_section_by_path<'a>(project: &'a RwLockWriteGuard<ProjectData>, path: &Vec<uuid::Uuid>) -> Result<&'a Section, ApiError>{
    let mut first_section : Option<&Section> = None;

    // Find first section
    for section in project.sections.iter(){
        if let SectionOrToc::Section(section) = section{
            if section.id.unwrap_or_default() == path[0]{
                first_section = Some(section);
            }
        }
    }

    // Return error if no first section found
    let first_section: &Section = match first_section{
        Some(first_section) => first_section,
        None => {
            println!("Couldn't find section with id {}", path[0]);
            return Err(ApiError::NotFound);
        }
    };

    let mut current_section: &Section = first_section;

    // Skip first element, because we already found it
    for part in path.iter().skip(1){

        // Search for next section in the current sections children
        let mut found = false;
        for child in current_section.children.iter(){
            if let SectionContent::Section(section) = child{
                if section.id.unwrap_or_default() == *part{
                    current_section = section;
                    found = true;
                    break;
                }
            }
        }
        if !found {
            println!("Couldn't find section with id {}", part);
            return Err(ApiError::NotFound);
        }
    }

    Ok(current_section)
}


#[derive(Debug, Serialize, Deserialize, Encode, Decode, Clone)]
pub struct User{
    pub email: String,
    pub password_hash: String,
    pub locked_until: Option<u64>,
    pub login_attempts: Vec<u64>
}

#[derive(Debug, Serialize, Deserialize, Encode, Decode, Clone)]
pub struct ProjectTemplate {
    #[bincode(with_serde)]
    pub id: uuid::Uuid,
    pub name: String,
    pub description: String,
}

pub async fn save_data_worker(data_storage: Arc<DataStorage>, project_storage: Arc<ProjectStorage>, settings: Settings){
    tokio::spawn(async move {
        let mut last_save = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(settings.backup_to_file_interval)).await;
            // Save DataStorage to disk
            println!("Saving DataStorage to disk");
            data_storage.save_to_disk(&settings).await.unwrap();

            // Save ProjectStorage to disk
            let mut projects_to_save = Vec::new();
            for project_id in project_storage.projects.read().unwrap().keys(){
                if let Some(project) = project_storage.projects.read().unwrap().get(project_id){
                    if let Some(project) = &project.data{
                        if project.read().unwrap().last_interaction > last_save{
                            projects_to_save.push(project_id.clone());
                        }
                    }

                }
            }
            for project_id in projects_to_save{
                println!("Saving changed project {} to disk", project_id);
                project_storage.save_project_to_disk(&project_id, &settings).await.unwrap();
            }
            last_save = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
            println!("Finished saving projects to disk");
        }
    });
}

#[cfg(test)]
mod tests {
    use std::thread;
    use super::*;
    #[test]
    fn setup_test_environment() {
        std::fs::remove_dir_all("test_data");
        std::fs::create_dir_all("test_data/projects").unwrap();
    }
    fn generate_settings() -> Settings {
        Settings {
            app_title: "Test".to_string(),
            project_cache_time: 4,
            data_path: "test_data".to_string(),
            file_lock_timeout: 10,
            backup_to_file_interval: 120,
        }
    }
    #[rocket::tokio::test]
    async fn test_save_project_to_disk(){
        setup_test_environment();
        let test_project = ProjectData{
            name: "Test Project".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project( test_project, &settings).await.unwrap();
        assert!(std::path::Path::new(&format!("test_data/projects/{}.bincode", id)).exists());
    }
    #[rocket::tokio::test]
    async fn test_load_from_disk(){
        setup_test_environment();
        let mut test_project = ProjectData{
            name: "Test Project".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project(test_project.clone(), &settings).await.unwrap();
        project_storage.load_from_directory(&settings).await.unwrap();
        let loaded_project = project_storage.get_project(&id, &settings).await.unwrap().read().unwrap().clone();
        test_project.last_interaction = loaded_project.last_interaction;
        assert_eq!(loaded_project, test_project);
    }

    #[rocket::tokio::test]
    async fn test_file_lock_unlocks(){
        setup_test_environment();
        let test_project = ProjectData{
            name: "Test Project".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project(test_project.clone(), &settings).await.unwrap();
        assert!(project_storage.wait_for_file_lock(&id, &settings).await.is_ok());
    }

    /// Test if file lock times out correctly
    #[rocket::tokio::test]
    async fn test_file_lock_timeout(){

        setup_test_environment();
        let test_project = ProjectData{
            name: "Test Project".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project(test_project.clone(), &settings).await.unwrap();

        project_storage.file_locks.get_mut().unwrap().insert(id.clone(), Arc::new(AtomicBool::new(true)));
        assert!(project_storage.wait_for_file_lock(&id, &settings).await.is_err());
    }

    /// Test if unused projects get unloaded correctly
    #[rocket::tokio::test]
    async fn test_unload_unused_projects(){
        setup_test_environment();
        let test_project = ProjectData{
            name: "Test Project".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project(test_project.clone(), &settings).await.unwrap();
        project_storage.unload_unused_projects(&settings).await.unwrap();
        assert!(project_storage.projects.read().unwrap().get(&id).unwrap().data.is_some());
        thread::sleep(std::time::Duration::from_secs(5));
        project_storage.unload_unused_projects(&settings).await.unwrap();
        assert!(project_storage.projects.read().unwrap().get(&id).unwrap().data.is_none());
    }


    /// Test set project
    #[rocket::tokio::test]
    async fn test_set_project(){
        setup_test_environment();
        let test_project = ProjectData{
            name: "Test Project Old".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
        let settings = generate_settings();
        let mut project_storage = ProjectStorage::new();
        let id = project_storage.insert_project(test_project, &settings).await.unwrap();
        let project_cpy = project_storage.get_project(&id, &settings).await.unwrap().clone();
        let test_project = ProjectData{
            name: "Test Project New".to_string(),
            description: None,
            template_id: Default::default(),
            last_interaction: 0,
            metadata: None,
            settings: None,
            sections: vec![],
        };
    }
}
