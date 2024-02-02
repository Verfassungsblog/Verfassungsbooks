use serde_derive::{Deserialize, Serialize};
use chrono::NaiveDateTime;
use bincode::{Encode, Decode};

/// Enum to differentiate between real sections and the position of the table of contents
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum SectionOrToc{
    Section(Section),
    Toc,
}

impl SectionOrToc{
    pub fn into_section(self) -> Option<Section> {
        match self {
            SectionOrToc::Section(section) => Some(section),
            SectionOrToc::Toc => None,
        }
    }
}

/// Struct holds all project-level settings
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct ProjectSettings{
    pub toc_enabled: bool
}


/// Struct holds all project-level metadata
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq, Default)]
pub struct ProjectMetadata{
    /// Book Title
    pub title: String,
    /// Subtitle of the book
    pub subtitle: Option<String>,
    /// List of ids of authors of the book
    #[bincode(with_serde)]
    pub authors: Option<Vec<uuid::Uuid>>,
    /// List of ids of editors of the book
    #[bincode(with_serde)]
    pub editors: Option<Vec<uuid::Uuid>>,
    /// URL to a web version of the book or reference
    pub web_url: Option<String>,
    /// List of identifiers of the book (e.g. ISBNs)
    // TODO: build identifier validator
    pub identifiers: Option<Vec<Identifier>>,
    /// Date of publication
    #[bincode(with_serde)]
    pub published: Option<NaiveDateTime>,
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
    pub ddc: Option<String>, //TODO: validate DDC on api set
    /// License of the book
    pub license: Option<License>,
    /// Series the book belongs to
    pub series: Option<String>,
    /// Volume of the book in the series
    pub volume: Option<String>,
    /// Edition of the book
    pub edition: Option<String>,
    /// Publisher of the book
    pub publisher: Option<String>,
}

/// Represents a Keyword, optionally with a GND ID
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Keyword{
    pub title: String,
    pub gnd: Option<Identifier>,
}

/// Holds all different (CC) licenses or a custom license
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum License{
    CC0,
    CC_BY_4,
    CC_BY_SA_4,
    CC_BY_ND_4,
    CC_BY_NC_4,
    CC_BY_NC_SA_4,
    CC_BY_NC_ND_4,
    Other(String),
}


/// Struct holds all data for a section (e.g. chapter, part, ...)
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Section{
    /// Unique id of the section
    /// Only None if the section is not yet saved in the database
    #[bincode(with_serde)]
    pub id: Option<uuid::Uuid>,
    /// Additional classes to style the Section
    pub css_classes: Vec<String>,
    /// Holds all contents of the section (either another section or a content block)
    pub children: Vec<SectionContent>,
    /// If true, the section is visible in the table of contents
    pub visible_in_toc: bool,
    /// Metadata of the section
    pub metadata: SectionMetadata,
}

impl Section{
    pub fn clone_without_contentblock_content(&self) -> Section {
        let mut new_section = self.clone();
        new_section.children = new_section.children.iter_mut().map(|child| child.clone_without_contentblock_content()).collect();
        new_section
    }

    pub fn clone_without_subsections(&self) -> Section {
        let mut new_section = self.clone();
        new_section.children = new_section.children.iter_mut().map(|child| match child{
            SectionContent::Section(section) => SectionContent::Section(section.clone_without_subsections()),
            SectionContent::ContentBlock(_) => child.clone(),
        }).collect();
        new_section
    }

    pub fn insert_child_section_as_child(&mut self, parent_section_id: &uuid::Uuid, new_section: &Section) -> Option<()>{
        for (i, child) in self.children.iter_mut().enumerate(){
            match child{
                SectionContent::Section(section) => {
                    if section.id == Some(*parent_section_id){
                        section.children.push(SectionContent::Section(new_section.clone()));
                        return Some(())
                    }else{
                        match section.insert_child_section_as_child(parent_section_id, new_section){
                            Some(_) => {
                                return Some(())
                            },
                            None => {},
                        }
                    }
                },
                SectionContent::ContentBlock(_) => {},
            }
        }
        None
    }

    pub fn insert_child_section_after(&mut self, section_id: &uuid::Uuid, new_section: &Section) -> Option<()>{
        for (i, child) in self.children.iter_mut().enumerate(){
            match child{
                SectionContent::Section(section) => {
                    if section.id == Some(*section_id){
                        self.children.insert(i+1, SectionContent::Section(new_section.clone()));
                        return Some(())
                    }else{
                        match section.insert_child_section_after(section_id, new_section){
                            Some(_) => {
                                return Some(())
                            },
                            None => {},
                        }
                    }
                },
                SectionContent::ContentBlock(_) => {},
            }
        }
        None
    }

    pub fn remove_child_section(&mut self, section_id: &uuid::Uuid) -> Option<Section>{
        let mut index = None;
        for (i, child) in self.children.iter_mut().enumerate(){
            match child{
                SectionContent::Section(section) => {
                    if section.id == Some(*section_id){
                        index = Some(i);
                    }else{
                        match section.remove_child_section(section_id){
                            Some(section) => {
                                return Some(section)
                            },
                            None => {},
                        }
                    }
                },
                SectionContent::ContentBlock(_) => {},
            }
        }
        match index{
            Some(index) => {
                let section = self.children.remove(index);
                match section{
                    SectionContent::Section(section) => Some(section),
                    SectionContent::ContentBlock(_) => None,
                }
            },
            None => None,
        }
    }
}

/// Enum to differentiate between real content blocks and another nested section
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum SectionContent{
    Section(Section),
    ContentBlock(ContentBlock),
}

impl SectionContent{
    pub fn clone_without_contentblock_content(&mut self) -> SectionContent{
        match self{
            SectionContent::Section(_) => self.clone(),
            SectionContent::ContentBlock(content_block) => SectionContent::ContentBlock(content_block.clone_without_contentblock_content()),
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct ContentBlock{
    #[bincode(with_serde)]
    pub id: uuid::Uuid,
    pub content: Option<InnerContentBlock>,
    pub css_classes: Option<Vec<String>>,
}

impl ContentBlock{
    pub fn clone_without_contentblock_content(&mut self) -> ContentBlock{
        let mut new_contentblock = self.clone();
        new_contentblock.content = None;
        new_contentblock
    }
}

/// Enum to differentiate between different content blocks
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum InnerContentBlock{
    Paragraph(Paragraph),
    Image, //TODO: implement
    Headline(Headline),
    List, //TODO: implement
    Blockquote, //TODO: implement
    CustomHTML(String),
    HorizontalRule,
    Table //TODO: implement
}

/// Headline Content Block, contains the level and the contents
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Headline{
    /// Level of the headline (e.g. h1, h2, ...)
    pub level: u8,
    /// Contents of the headline as TextElements
    pub contents: Vec<TextElement>
}

/// Paragraph Content Block holding TextElements
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Paragraph{
    #[bincode(with_serde)]
    revision_id: uuid::Uuid,
    /// Contents of the paragraph
    pub contents: Vec<TextElement>,
    /// Optional block-level alignment of the paragraph
    pub alignment: Option<Alignment>,
}

/// Alignment of a paragraph
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum Alignment {
    Left,
    Center,
    Right,
    Justify,
}

/// Enum to differentiate between different text elements
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum TextElement{
    /// Simple text
    String(String),
    /// Formatted text (e.g. bold, italic, ...) which can contain other text elements
    FormattedText(FormattedText),
    /// Weblink
    Link(Link),
    /// Footnote or Endnote
    Note(Note),
    /// Linebreak
    LineBreak
}

/// Weblink to url with optional link text
///
/// If no link text is given, the url is used as link text
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Link{
    pub url: String,
    pub text: Option<Vec<TextElement>>,
}

/// Footnote or Endnote
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Note{
    /// Type of the note (footnote or endnote)
    pub note_type: NoteType,
    /// Contents of the note
    pub content: Vec<TextElement>,
}

/// Enum to differentiate between footnote and endnote
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum NoteType{
    Footnote,
    Endnote,
}

/// Container to hold text elements and set the format of these text elements
///
/// You may capsule other FormattedText elements to create nested formatting
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct FormattedText{
    pub contents: Vec<TextElement>,
    pub format: TextFormat,
}

/// Enum to differentiate between different text formats
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum TextFormat{
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Superscript,
    Subscript,
    None,
}

/// Enum to differentiate between different section levels
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum SectionLevel{
    Part,
    Chapter,
    Custom
}

/// Struct holds all metadata of a section
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct SectionMetadata{
    pub title: String,
    pub subtitle: Option<String>,
    #[bincode(with_serde)]
    pub authors: Vec<uuid::Uuid>,
    #[bincode(with_serde)]
    pub editors: Vec<uuid::Uuid>,
    pub web_url: Option<String>,
    pub identifiers: Vec<Identifier>,
    #[bincode(with_serde)]
    pub published: Option<NaiveDateTime>,
    #[bincode(with_serde)]
    pub last_changed: Option<NaiveDateTime>,
    pub lang: Option<Language>,
}

/// Enum to differentiate between all supported languages
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq, FromFormField)]
pub enum Language{
    DE,
    EN
}

/// Struct holds all data for a person (e.g. author or editor)
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Person {
    #[bincode(with_serde)]
    pub id: Option<uuid::Uuid>,
    pub first_names: Option<String>,
    pub last_names: String,
    pub orcid: Option<Identifier>,
    pub gnd: Option<Identifier>,
    pub bios: Option<Vec<Biography>>,
    pub ror: Option<Identifier>,
}

/// Struct holds a biography in a specified language for a person
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Biography {
    pub content: String,
    pub lang: Option<Language>,
}

/// Represents an identifier (e.g. DOI, ISBN, ISSN, URL, URN, ORCID, ROR, ...)
#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub struct Identifier{
    #[bincode(with_serde)]
    pub id: Option<uuid::Uuid>,
    pub name: String,
    pub value: String,
    pub identifier_type: IdentifierType,
}

impl Identifier{
    /// Create new identifier
    ///
    /// Arguments
    /// * `identifier_type` - Type of identifier as [`IdentifierType`]
    /// * `value` - Value of identifier as [`String`]
    /// * `name` - Name of identifier as [`Option<String>`] - optional
    ///     if not given, the name of the identifier type is used
    ///
    /// Returns
    /// * `Identifier` - New identifier
    pub fn new(identifier_type: IdentifierType, value: String, name: Option<String>) -> Self{
        // If no name is given, use the name of the identifier type
        let name = match name{
            Some(name) => name,
            None => match &identifier_type{
                IdentifierType::DOI => "DOI".to_string(),
                IdentifierType::ISBN => "ISBN".to_string(),
                IdentifierType::ISSN => "ISSN".to_string(),
                IdentifierType::URL => "URL".to_string(),
                IdentifierType::URN => "URN".to_string(),
                IdentifierType::ORCID => "ORCID".to_string(),
                IdentifierType::ROR => "ROR".to_string(),
                IdentifierType::GND => "GND".to_string(),
                IdentifierType::Other(other) => other.clone(),
            },
        };
        Self{
            id: Some(uuid::Uuid::new_v4()),
            name,
            value,
            identifier_type,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Encode, Decode, Clone, PartialEq)]
pub enum IdentifierType{
    DOI,
    ISBN,
    ISSN,
    URL,
    URN,
    ORCID,
    ROR,
    GND,
    Other(String),
}

pub mod create;
pub mod editor;
pub mod list;

pub mod api;