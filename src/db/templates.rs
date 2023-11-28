use serde_derive::Serialize;
use sqlx::PgPool;

#[derive(Serialize, Debug)]
pub struct ProjectTemplate{
    pub template_id: uuid::Uuid,
    pub name: String,
    pub description: Option<String>,
}

pub async fn get_project_templates(db_pool: &PgPool) -> Result<Vec<ProjectTemplate>, sqlx::Error> {
    match sqlx::query_as!(ProjectTemplate, "SELECT * FROM templates").fetch_all(db_pool).await{
        Ok(templates) => Ok(templates),
        Err(e) => {
            eprintln!("Couldn't get project templates: {}", e);
            Err(e)
        },
    }
}