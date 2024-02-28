use serde::{Deserialize, Serialize};
use crate::projects::{BlockType, Identifier, Keyword, Language, License, Person, ProjectSettings};

pub mod preprocessing;
pub mod rendering_manager;
pub mod download;

#[derive(Serialize, Deserialize)]
pub struct PreparedProject{
    pub metadata: PreparedMetadata,
    pub settings: Option<ProjectSettings>,
    pub data: Vec<PreparedSection>,
}

#[derive(Serialize, Deserialize)]
pub struct PreparedMetadata{
    /// Book Title
    pub title: String,
    /// Subtitle of the book
    pub subtitle: Option<String>,
    /// List of authors of the book
    pub authors: Vec<Person>,
    /// List of editors
    pub editors: Vec<Person>,
    /// URL to a web version of the book or reference
    pub web_url: Option<String>,
    /// List of identifiers of the book (e.g. ISBNs)
    pub identifiers: Option<Vec<Identifier>>,
    /// Date of publication
    pub published: Option<String>,
    /// Languages of the book
    pub languages: Option<Vec<Language>>,
    /// Number of pages of the book (should be automatically calculated)
    pub number_of_pages: Option<u32>,
    /// Short abstract of the book
    pub short_abstract: Option<String>,
    /// Long abstract of the book
    pub long_abstract: Option<String>,
    /// Keywords of the book
    pub keywords: Option<Vec<Keyword>>,
    /// Dewey Decimal Classification (DDC) classes (subject groups)
    pub ddc: Option<String>,
    /// License of the book
    pub license: Option<PreparedLicense>,
    /// Series the book belongs to
    pub series: Option<String>,
    /// Volume of the book in the series
    pub volume: Option<String>,
    /// Edition of the book
    pub edition: Option<String>,
    /// Publisher of the book
    pub publisher: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct PreparedLicense{
    CC0: bool,
    CC_BY_4: bool,
    CC_BY_SA_4: bool,
    CC_BY_ND_4: bool,
    CC_BY_NC_4: bool,
    CC_BY_NC_SA_4: bool,
    CC_BY_NC_ND_4: bool,
    other: String,
}

/// implement from License -> PreparedLicense
impl From<License> for PreparedLicense{
    fn from(license: License) -> Self{
        match license{
            License::CC0 => PreparedLicense{CC0: true, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_4 => PreparedLicense{CC0: false, CC_BY_4: true, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_SA_4 => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: true, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_ND_4 => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: true, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_NC_4 => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: true, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_NC_SA_4 => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: true, CC_BY_NC_ND_4: false, other: String::new()},
            License::CC_BY_NC_ND_4 => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: true, other: String::new()},
            License::Other(other) => PreparedLicense{CC0: false, CC_BY_4: false, CC_BY_SA_4: false, CC_BY_ND_4: false, CC_BY_NC_4: false, CC_BY_NC_SA_4: false, CC_BY_NC_ND_4: false, other},
        }
    }
}

/// Represents a single entry in the Table of Contents
#[derive(Serialize, Deserialize)]
pub struct TocEntry{
    pub title: String,
    pub level: u32,
    pub id: uuid::Uuid,
    pub children: Vec<TocEntry>
}

#[derive(Serialize, Deserialize)]
pub struct PreparedSection{
    pub id: uuid::Uuid,
    pub sub_sections: Vec<PreparedSection>,
    pub children: Vec<PreparedContentBlock>,
    pub metadata: PreparedSectionMetadata,
    pub visible_in_toc: bool,
    pub endnotes: Vec<PreparedEndnote>
}

#[derive(Serialize, Deserialize)]
pub struct PreparedEndnote{
    pub num: usize,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct PreparedSectionMetadata{
    pub title: String,
    pub subtitle: Option<String>,
    pub authors: Vec<Person>,
    pub editors: Vec<Person>,
    pub web_url: Option<String>,
    pub identifiers: Vec<Identifier>,
    pub published: Option<String>,
    pub lang: Option<Language>,
}

#[derive(Serialize, Deserialize)]
pub struct PreparedContentBlock{
    pub id: String,
    pub block_type: BlockType,
    pub html: String,
}