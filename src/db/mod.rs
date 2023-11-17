use diesel::{Connection, MysqlConnection};

pub mod users;
mod templates;
mod projects;

pub mod login_attempts;

pub fn establish_connection(connection_string: String) -> MysqlConnection{
    MysqlConnection::establish(&connection_string)
        .expect(&format!("Error connecting to database!"))
}