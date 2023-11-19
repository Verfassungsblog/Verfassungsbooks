use sqlx::PgPool;
use sqlx::postgres::PgQueryResult;
use uuid::Uuid;
pub struct User{
    pub user_id: Uuid,
    pub name: String,
    pub email: String,
    pub password_hash: Option<String>,
    pub temp_locked_until: Option<i64>
}

pub async fn get_user_by_email(db_pool: &PgPool, email: &str) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(User, "SELECT * FROM users WHERE email = $1", email)
        .fetch_optional(db_pool)
        .await
}

pub async fn set_temp_locked_until_null(db_pool: &PgPool,user_id: Uuid) -> Result<PgQueryResult, sqlx::Error> {
    sqlx::query!("UPDATE users SET temp_locked_until = NULL WHERE user_id = $1", user_id)
        .execute(db_pool)
        .await
}

pub async fn temp_lock_user_until(db_pool: &PgPool, user_id: Uuid, timestamp: i64) -> Result<PgQueryResult, sqlx::Error> {
    sqlx::query!("UPDATE users SET temp_locked_until = $1 WHERE user_id = $2", timestamp, user_id)
        .execute(db_pool)
        .await
}