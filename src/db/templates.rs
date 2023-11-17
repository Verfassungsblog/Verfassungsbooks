use diesel::prelude::*;
#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::templates)]
pub struct Template {
    id: u64,
    name: String,
    description: Option<String>,
    path: String
}