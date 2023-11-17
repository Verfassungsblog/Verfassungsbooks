use diesel::prelude::*;

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::projects)]
pub struct Project {
    pub id: u64,
    pub name: String,
    pub description: Option<String>,
    pub template_id: u64,
}