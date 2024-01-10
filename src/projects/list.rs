use std::collections::BTreeMap;
use std::sync::Arc;
use rocket_dyn_templates::Template;
use rocket::State;
use crate::data_storage::ProjectStorage;
use crate::session::session_guard::Session;

#[get("/")]
pub fn list_projects(_session: Session, project_storage: &State<Arc<ProjectStorage>>) -> Template {
    // Get all projects
    let mut projects = vec![];

    #[derive(serde::Serialize)]
    struct TempProject{
        id: uuid::Uuid,
        name: String
    }

    let binding = project_storage.projects.read().unwrap();
    for project in binding.iter() {
        println!("Project: {:?}", project.1.name);
        projects.push(TempProject{
            id: project.0.clone(),
            name: project.1.name.clone()
        });
    }

    let mut data = BTreeMap::new();
    data.insert("projects", projects);
    Template::render("dashboard", data)
}