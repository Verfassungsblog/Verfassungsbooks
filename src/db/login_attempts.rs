use sqlx::{Error, PgPool, Row};
use sqlx::postgres::PgQueryResult;
use uuid::Uuid;

pub async fn get_num_of_login_attempts_in_last_hour(db_pool: &PgPool, user_id: &Uuid) -> Result<i64, sqlx::Error> {
    sqlx::query("SELECT COUNT(*) as count FROM login_attempts WHERE user_id = $1 AND timestamp >= (now() - interval '1 hour')")
        .bind(user_id)
        .fetch_one(db_pool)
        .await?
        .try_get("count")
}

pub async fn remove_login_attempts_for_user(db_pool: &PgPool, user_id: &Uuid) -> Result<PgQueryResult, Error> {
    sqlx::query!("DELETE FROM login_attempts WHERE user_id = $1", user_id).execute(db_pool).await
}

pub async fn add_login_attempt(db_pool: &PgPool, user_id: &Uuid) -> Result<PgQueryResult, Error> {
    sqlx::query!("INSERT INTO login_attempts (user_id) VALUES ($1)", user_id).execute(db_pool).await
}