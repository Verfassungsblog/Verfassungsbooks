use diesel::prelude::*;
use rocket::State;
use crate::settings::Settings;

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::users)]
pub struct User {
    pub id: u64,
    pub email: String,
    pub password_hash: Option<String>,
    pub temp_locked_until: Option<i32>,
}

pub fn get_user_by_email(input_email: &str, settings: &State<Settings>) -> Option<User> {
    use crate::schema::users::dsl::*;
    let mut connection = crate::db::establish_connection(settings.database_string.clone());

    match users.filter(email.eq(input_email)).first::<User>(&mut connection).optional() {
        Ok(user) => user,
        Err(e) =>
            {
                println!("Error retrieving user: {}", e);
                None
            }
    }
}

pub fn temp_lock_user_until(user_id: u64, timestamp: i32, settings: &State<Settings>) -> bool {
    use crate::schema::users::dsl::*;
    let mut connection = crate::db::establish_connection(settings.database_string.clone());

    match diesel::update(users.filter(id.eq(user_id))).set(temp_locked_until.eq(timestamp)).execute(&mut connection) {
        Ok(_) => true,
        Err(e) =>
            {
                println!("Error locking user: {}", e);
                false
            }
    }
}

pub fn set_temp_lock_until_null(user_id: u64, settings: &State<Settings>) -> bool {
    use crate::schema::users::dsl::*;
    let mut connection = crate::db::establish_connection(settings.database_string.clone());

    match diesel::update(users.filter(id.eq(user_id))).set(temp_locked_until.eq::<Option<i32>>(None)).execute(&mut connection) {
        Ok(_) => true,
        Err(e) =>
            {
                println!("Error unlocking user: {}", e);
                false
            }
    }
}