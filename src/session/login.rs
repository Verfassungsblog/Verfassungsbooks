use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};
use rocket::form::Form;
use rocket::response::Redirect;
use rocket::State;
use rocket_dyn_templates::Template;
use rocket::http::CookieJar;
use crate::settings::Settings;
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use crate::db::login_attempts::remove_login_attempts;
use crate::db::users::{set_temp_lock_until_null, temp_lock_user_until};
use crate::schema::login_attempts::dsl::login_attempts;
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
pub fn process_login(login_form: Form<LoginForm>, settings: &State<Settings>, session_storage: &State<SessionStorage>, cookies: &CookieJar<'_>) -> Redirect{
    //Check if user exists, if get password hash and compare with login_form.password
    let user = crate::db::users::get_user_by_email(&login_form.email, &settings);
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
                if temp_locked_until > (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i32){
                    return Redirect::to("/login?error=too-many-attempts");
                }else{
                    //Remove expired temp log and old login attempts
                    set_temp_lock_until_null(user.id, &settings);
                    remove_login_attempts(login_form.email.clone(), &settings).unwrap();
                }
            }

            //Check number of password attempts in the last hour
            let attempts = crate::db::login_attempts::get_login_attempts(login_form.email.clone(), &settings).unwrap();
            if attempts >= 5 {
                temp_lock_user_until(user.id, (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + 900) as i32, &settings);
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
                //Generate session and redirect to dashboard
                let session = session_storage.generate_session(user.id, user.email);
                //Set cookie
                cookies.add_private(rocket::http::Cookie::new("session", session.id.clone()));
                Redirect::to("/")
            }else{
                crate::db::login_attempts::add_login_attempt(login_form.email.clone(), &settings).unwrap();
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
    let salt = SaltString::generate(&mut OsRng);
    let password = b"123456";
    let argon2 = Argon2::default();
    let hash : String = argon2.hash_password(password,&salt).unwrap().to_string();
    print!("{}", hash);
}