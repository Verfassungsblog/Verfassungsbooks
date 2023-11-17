use std::time::{SystemTime, UNIX_EPOCH};
use diesel::RunQueryDsl;
use diesel::QueryDsl;
use rocket::State;
use crate::db::establish_connection;
use crate::schema::login_attempts::dsl::*;
use diesel::ExpressionMethods;
use crate::settings::Settings;

/// Add login attempt for a given email address to the database
///
/// Should be called after every failed login attempt
pub fn add_login_attempt(input_email: String, settings: &State<Settings>) -> Result<usize, diesel::result::Error>{
    diesel::insert_into(login_attempts).values((email.eq(input_email.to_lowercase()))).execute(&mut establish_connection(settings.database_string.clone()))
}

/// Get number of failed login attempts for a given email address in the last hour
pub fn get_login_attempts(input_email: String, settings: &State<Settings>) -> Result<i64, diesel::result::Error>{
    let timestamp_hour_ago: i32 = (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() - 3600) as i32;
    let res = login_attempts.filter(email.eq(input_email.to_lowercase())).filter(timestamp.ge(timestamp_hour_ago)).count().get_result::<i64>(&mut establish_connection(settings.database_string.clone()));
    res
}

/// Remove all login attempts for a given email address
pub fn remove_login_attempts(input_email: String, settings: &State<Settings>) -> Result<usize, diesel::result::Error>{
    diesel::delete(login_attempts.filter(email.eq(input_email.to_lowercase()))).execute(&mut establish_connection(settings.database_string.clone()))
}