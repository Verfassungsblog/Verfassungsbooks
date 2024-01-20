use rocket::serde::json::Json;
use crate::projects::api::{ApiError, ApiResult};

/// Search lobid GND API (https://lobid.org/gnd/api)
#[get("/api/gnd?<q>")]
pub async fn search_gnd(q: String) -> Json<ApiResult<serde_json::Value>>{
    let url = format!("https://lobid.org/gnd/search?q={}&format=json:preferredName", q);
    let resp = match reqwest::get(&url).await{
        Ok(resp) => resp,
        Err(e) => return ApiResult::new_error(ApiError::Other(e.to_string()))
    };
    match resp.json::<serde_json::Value>().await{
        Ok(json) => ApiResult::new_data(json),
        Err(e) => return ApiResult::new_error(ApiError::Other(e.to_string()))
    }
}