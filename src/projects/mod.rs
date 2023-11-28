use serde_derive::{Deserialize, Serialize};
use sqlx::types::Json;
use chrono::NaiveDateTime;
use sqlx::FromRow;


#[derive(Deserialize, Serialize, sqlx::FromRow, Debug)]
pub struct Project{
    pub project_id: uuid::Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_id: uuid::Uuid,
    pub contents:Option<Json<ProjectContent>>,
    pub last_modified: Option<NaiveDateTime>,
}

#[derive(Deserialize, Serialize, FromRow, Debug)]
pub struct ProjectOverviewEntry{
    pub project_id: uuid::Uuid,
    pub name: String,
    pub description: Option<String>,
    pub last_modified: Option<NaiveDateTime>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct ProjectContent{
    pub sections: Vec<SectionOrToc>,
    pub settings: ProjectSettings,
    pub metadata: ProjectMetadata,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum SectionOrToc{
    Section(Section),
    Toc,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct ProjectSettings{
    pub toc_enabled: bool,
    pub default_language: Language,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct ProjectMetadata{
    pub title: String,
    pub subtitle: Option<String>,
    pub authors: Option<Vec<Person>>,
    pub editors: Option<Vec<Person>>,
    pub web_url: Option<String>,
    pub identifiers: Option<Vec<Identifier>>,
    pub published: Option<NaiveDateTime>,
    pub languages: Option<Vec<Language>>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Section{
    pub level: SectionLevel,
    pub children: Vec<SectionContent>,
    pub visible_in_toc: bool,
    pub metadata: SectionMetadata,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum SectionContent{
    Section(Section),
    ContentBlock(ContentBlock),
}

#[derive(Deserialize, Serialize, Debug)]
pub enum ContentBlock{
    Paragraph(Paragraph),
    Image, //TODO: implement
    Headline(Headline),
    List, //TODO: implement
    Blockquote, //TODO: implement
    CustomHTML(String),
    HorizontalRule, //TODO: implement
    Table //TODO: implement
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Headline{
    pub level: u8,
    pub contents: Vec<TextElement>
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Paragraph{
    pub contents: Vec<TextElement>
}

#[derive(Deserialize, Serialize, Debug)]
pub enum TextElement{
    String(String),
    FormattedText(FormattedText),
    Link(Link),
    Note(Note),
    LineBreak
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Link{
    pub url: String,
    pub text: Vec<TextElement>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Note{
    pub note_type: NoteType,
    pub content: Vec<TextElement>,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum NoteType{
    Footnote,
    Endnote,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct FormattedText{
    pub contents: Vec<TextElement>,
    pub format: TextFormat,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum TextFormat{
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Superscript,
    Subscript,
    None,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum SectionLevel{
    Part,
    Chapter
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SectionMetadata{
    pub title: String,
    pub description: Option<String>,
    pub authors: Option<Vec<Person>>,
    pub editors: Option<Vec<Person>>,
    pub web_url: Option<String>,
    pub identifiers: Option<Vec<Identifier>>,
    pub published: Option<NaiveDateTime>,
    pub last_changed: Option<NaiveDateTime>,
    pub lang: Option<Language>,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum Language{
    DE,
    EN
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Person {
    pub first_names: Option<String>,
    pub last_names: String,
    pub orcid: Option<Identifier>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Identifier{
    pub value: String,
    pub identifier_type: IdentifierType,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum IdentifierType{
    DOI,
    ISBN,
    ISSN,
    URL,
    URN,
    ORCID,
    Other(String),
}

pub mod create;
pub mod editor;