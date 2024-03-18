use chrono::Utc;
use serde::{Deserialize, Serialize};
use crate::import::processing::ImportProcessor;
use crate::projects::{Section, SectionMetadata};

/// Import from Wordpress API
pub struct WordpressAPI{
    base_url: String,
    username: Option<String>,
    password: Option<String>,
}

#[derive(Debug)]
pub enum WordpressAPIError{
    SerdeParsingError,
    ReqwestError,
    InvalidURL,
    NotFound,
}

impl WordpressAPI {
    pub fn new(base_url: String) -> Self {
        WordpressAPI {
            base_url,
            username: None,
            password: None,
        }
    }

    pub fn new_authenticated(base_url: String, username: String, password: String) -> Self {
        WordpressAPI {
            base_url,
            username: Some(username),
            password: Some(password),
        }
    }


    pub async fn get_posts(&self, page: Option<usize>, per_page: Option<usize>, search: Option<String>, after: Option<chrono::NaiveDateTime>, modified_after: Option<chrono::NaiveDateTime>, slug: Option<String>) -> Result<Vec<Post>, WordpressAPIError>{
        let url = format!("https://{}/wp-json/wp/v2/posts", self.base_url);
        println!("URL is {}", url);
        let client = reqwest::Client::new();
        let mut request = client.request(reqwest::Method::GET, &url);

        let mut query: Vec<(String, String)> = Vec::new();
        if let Some(page) = page {
            query.push(("page".to_string(), page.to_string()));
        }
        if let Some(per_page) = per_page {
            query.push(("per_page".to_string(), per_page.to_string()));
        }
        if let Some(search) = search {
            query.push(("search".to_string(), search));
        }
        if let Some(after) = after {
            query.push(("after".to_string(), after.to_string()));
        }
        if let Some(modified_after) = modified_after {
            query.push(("modified_after".to_string(), modified_after.to_string()));
        }
        if let Some(slug) = slug {
            query.push(("slug".to_string(), slug));
        }
        println!("Query is: {:?}", query);
        let request = request.query(&query);
        match request.send().await{
            Ok(response) => match response.json::<Vec<Post>>().await{
                Ok(posts) => Ok(posts),
                Err(e) => {
                    eprintln!("Error parsing posts: {}", e);
                    Err(WordpressAPIError::SerdeParsingError)
                }
            },
            Err(e) => {
                eprintln!("Error fetching posts: {}", e);
                return Err(WordpressAPIError::ReqwestError);
            }
        }
    }

    pub async fn get_post(&self, id: usize) -> Result<Post, WordpressAPIError> {
        let url = format!("{}/wp-json/wp/v2/posts/{}", self.base_url, id);
        let response = reqwest::get(&url).await;
        match response {
            Ok(response) => {
                //let res : serde_json::Value = response.json().await.unwrap();
                //println!("Response: {:?}", res);
                let post: Post = match  response.json().await{
                    Ok(post) => post,
                    Err(e) => {
                        eprintln!("Error parsing post {}: {}", id, e);
                        return Err(WordpressAPIError::SerdeParsingError);
                    }
                };
                Ok(post)
            },
            Err(e) => {
                eprintln!("Error fetching post {}: {}", id, e);
                Err(WordpressAPIError::ReqwestError)
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub enum PostStatus{
    Publish,
    Future,
    Draft,
    Pending,
    Private
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderedContent{
    pub(crate) rendered: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostAcf{
    pub subheadline: Option<String>,
    pub copyright: Option<String>,
    pub doi: Option<String>,
    pub crossref_doi: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoAuthor{
    pub display_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Post{
    #[serde(rename = "date_gmt")]
    pub(crate) date: chrono::NaiveDateTime,
    pub(crate) id: usize,
    pub(crate) link: String,
    #[serde(rename = "modified_gmt")]
    pub(crate) modified: chrono::NaiveDateTime,
    pub(crate) slug: String,
    #[serde(rename = "type")]
    pub(crate) post_type: String,
    pub(crate) title: RenderedContent,
    pub(crate) content: RenderedContent,
    pub(crate) excerpt: RenderedContent,
    pub(crate) author: usize,
    pub(crate) featured_media: usize,
    pub(crate) categories: Vec<usize>,
    pub(crate) tags: Vec<usize>,
    pub(crate) acf: Option<PostAcf>,
    pub(crate) coauthors: Option<Vec<CoAuthor>>
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_import_single_post() {
        let api = WordpressAPI::new("https://verfassungsblog.de".to_string());
        let post = api.get_post(79100).await.unwrap();
        println!("{:?}", post);
    }

    #[tokio::test]
    async fn test_import_posts() {
        let api = WordpressAPI::new("https://verfassungsblog.de".to_string());
        let posts = api.get_posts(None, None, None, None, None, None).await.unwrap();
        println!("{:?}", posts);
    }
}
