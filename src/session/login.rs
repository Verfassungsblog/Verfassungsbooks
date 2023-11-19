use sqlx::PgPool;
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};
use rocket::form::Form;
use rocket::response::Redirect;
use rocket::State;
use rocket_dyn_templates::Template;
use rocket::http::CookieJar;
use argon2::{password_hash::{
    PasswordHash, PasswordVerifier
}, Argon2};
use crate::session::session_storage::SessionStorage;

/// Show login page
/// Method: GET
#[get("/login?<error>")]
pub fn login_page(error: Option<String>) -> Template {
    let mut context: BTreeMap<String, bool> = BTreeMap::new();


    if let Some(error) = error{
        if error == "invalid"{
            context.insert("error_invalid".to_string(), true);
        }else if error == "contact-admin" {
            context.insert("error_contact_admin".to_string(), true);
        }else if error == "too-many-attempts" {
            context.insert("error_too_many_attempts".to_string(), true);
        }
    }
    Template::render("login", context)
}

#[derive(FromForm)]
pub struct LoginForm {
    pub email: String,
    pub password: String,
}

/// Process login form
/// If user exists and password is correct, generate session and redirect to dashboard
/// If user exists and password is incorrect, redirect to login page with error message
/// If user does not exist, redirect to login page with error message
///
/// Method: POST
/// Route: /login
/// Form params:
/// * email: String
/// * password: String
#[post("/login", data = "<login_form>")]
pub async fn process_login(login_form: Form<LoginForm>, db_pool: &State<PgPool>, session_storage: &State<SessionStorage>, cookies: &CookieJar<'_>) -> Redirect{
    //Check if user exists, if get password hash and compare with login_form.password
    let user = match crate::db::users::get_user_by_email(db_pool, &login_form.email).await {
        Ok(user) => user,
        Err(e) => {
            eprintln!("Error while getting user by email: {}", e);
            return Redirect::to("/login?error=contact-admin");
        }
    };
    match user{
        Some(user) => {
            let hash = match user.password_hash{
                Some(hash) => hash,
                None => {
                    return Redirect::to("/login?error=contact-admin");
                }
            };


            //Check if user is temporarily locked
            if let Some(temp_locked_until) = user.temp_locked_until{
                if temp_locked_until > (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64){
                    return Redirect::to("/login?error=too-many-attempts");
                }else{
                    //Remove expired temp log and old login attempts
                    crate::db::users::set_temp_locked_until_null(db_pool, user.user_id).await.unwrap();
                    crate::db::login_attempts::remove_login_attempts_for_user(db_pool, &user.user_id).await.unwrap();
                }
            }

            //Check number of password attempts in the last hour
            let attempts = crate::db::login_attempts::get_num_of_login_attempts_in_last_hour(db_pool, &user.user_id).await.unwrap();

            if attempts >= 5 {
                crate::db::users::temp_lock_user_until(db_pool, user.user_id, (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + 900) as i64).await.unwrap();
            }

            //Verify password
            let hash = match PasswordHash::new(&hash){
                Ok(hash) => hash,
                Err(e) => {
                    eprintln!("Error: user {} has invalid password hash: {}", user.email, e);
                    return Redirect::to("/login?error=contact-admin");
                }
            };
            let argon2 = Argon2::default();

            if argon2.verify_password(login_form.password.as_bytes(), &hash).is_ok() {
                println!("Correct password");
                //Generate session and redirect to dashboard
                let session = session_storage.generate_session(user.user_id, user.email);
                //Set cookie
                cookies.add_private(rocket::http::Cookie::new("session", session.id.clone()));
                Redirect::to("/")
            }else{
                println!("Incorrect password");
                crate::db::login_attempts::add_login_attempt(db_pool, &user.user_id).await.unwrap();
                //Redirect to login page with error message
                Redirect::to("/login?error=invalid")
            }
        },
        None => {
            //Redirect to login page with error message
            Redirect::to("/login?error=invalid")
        }
    }
}

#[test]
pub fn generate_hash(){
    use argon2::PasswordHasher;
    use argon2::password_hash::rand_core::OsRng;
    let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
    let password = b"123456";
    let argon2 = Argon2::default();
    let hash : String = argon2.hash_password(password,&salt).unwrap().to_string();
    print!("{}", hash);
}