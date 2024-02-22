use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use handlebars::{DirectorySourceOptions, Handlebars, TemplateError};
use regex::Regex;
use rocket::State;
use crate::data_storage::{DataStorage, ProjectData};
use crate::export::{PreparedContentBlock, PreparedLicense, PreparedMetadata, PreparedProject, PreparedSection, PreparedSectionMetadata};
use crate::export::rendering_manager::RenderingError;
use crate::projects::{BlockData, License, NewContentBlock, Section, SectionOrToc};
use crate::settings::Settings;

pub fn render_project(prepared_project: PreparedProject, template_id: uuid::Uuid, temp_dir: &Path, settings: &Settings) -> Result<(), RenderingError>{
    // Load templates
    let mut handlebars = Handlebars::new();
    match handlebars.register_templates_directory(Path::new(&format!("{}/templates/{}/templates", settings.data_path, template_id)), DirectorySourceOptions::default()){
        Ok(_) => {}
        Err(e) => {
            eprintln!("Couldn't load templates for export: {}", e);
            return Err(RenderingError::ErrorLoadingTemplate(e.to_string()));
        }
    }

    // Copy output folder contents to working folder
    if let Err(e) =  crate::utils::fs_copy_recursive::copy_dir_all(format!("{}/templates/{}/output", settings.data_path, template_id), temp_dir){
        eprintln!("Couldn't copy template to output directory: {}", e);
        return Err(RenderingError::ErrorCopyingTemplate(e.to_string()));
    }

    let res = match handlebars.render("main", &prepared_project){
        Ok(res) => res,
        Err(e) => {
            eprintln!("Couldn't render template: {}", e);
            return Err(RenderingError::ioError(e.to_string()));
        }
    };
    if let Err(e) =  fs::write(temp_dir.join("index.html"), res){
        eprintln!("Couldn't write rendered template to file: {}", e);
        return Err(RenderingError::ioError(e.to_string()));
    }

    let output =  Command::new("vivliostyle").current_dir(temp_dir).args(&["build", "index.html", "-o", "output.pdf"]).output();
    match output{
        Ok(out) => {
            if out.status.success(){
                Ok(())
            }else{
                let out = String::from_utf8_lossy(&out.stderr);
                eprintln!("Export failed: {}", out);
                Err(RenderingError::VivliostyleError(out.to_string()))
            }
        }
        Err(e) => {
            println!("Couldn't run vivliostyle: {}", e);
            Err(RenderingError::VivliostyleError(e.to_string()))
        }
    }
}

pub fn prepare_project(project_data: ProjectData, data_storage: Arc<DataStorage>) -> Result<PreparedProject, RenderingError>{
    let metadata = match project_data.metadata{
        Some(metadata) => metadata,
        None => return Err(RenderingError::ProjectMetadataMissing)
    };
    
    let mut authors = vec![];
    for author in metadata.authors.unwrap_or_default(){
        let person = match data_storage.get_person(&author){
            Some(person) => person.read().unwrap().clone(),
            None => {
                eprintln!("Author with id {} not found while rendering section for export!", author);
                continue
            }
        };
        authors.push(person);
    }

    let mut editors = vec![];
    for editor in metadata.editors.unwrap_or_default(){
        let person = match data_storage.get_person(&editor){
            Some(person) => person.read().unwrap().clone(),
            None => {
                eprintln!("Editor with id {} not found while rendering section for export!", editor);
                continue
            }
        };
        editors.push(person);
    }

    let published = match metadata.published{
        Some(date) => Some(date.format("%d.%m.%Y").to_string()),
        None => None
    };

    let license = if let Some(license) = metadata.license{
        Some(PreparedLicense::from(license))
    }else{
        None
    };

    let metadata = PreparedMetadata{
        title: metadata.title,
        subtitle: metadata.subtitle,
        authors,
        editors,
        web_url: metadata.web_url,
        identifiers: metadata.identifiers,
        published,
        languages: metadata.languages,
        number_of_pages: metadata.number_of_pages,
        short_abstract: metadata.short_abstract,
        long_abstract: metadata.long_abstract,
        keywords: metadata.keywords,
        ddc: metadata.ddc,
        license,
        series: metadata.series,
        volume: metadata.volume,
        edition: metadata.edition,
        publisher: metadata.publisher,
    };

    let mut data = vec![];
    for section in project_data.sections{
        if let SectionOrToc::Section(section) = section{
            data.push(render_section(section, data_storage.clone()));
        }
    }

    Ok(PreparedProject{
        metadata,
        settings: project_data.settings,
        data,
    })
}

pub fn render_section(section: Section, data_storage: Arc<DataStorage>) -> PreparedSection{
    let published = match section.metadata.published{
        Some(date) => Some(date.format("%d.%m.%Y").to_string()),
        None => None
    };

    let mut authors = vec![];
    for author in section.metadata.authors{
        let person = match data_storage.get_person(&author){
            Some(person) => person.read().unwrap().clone(),
            None => {
                eprintln!("Author with id {} not found while rendering section for export!", author);
                continue
            }
        };
        authors.push(person);
    }

    let mut editors = vec![];
    for editor in section.metadata.editors{
        let person = match data_storage.get_person(&editor){
            Some(person) => person.read().unwrap().clone(),
            None => {
                eprintln!("Editor with id {} not found while rendering section for export!", editor);
                continue
            }
        };
        editors.push(person);
    }

    let metadata = PreparedSectionMetadata{
        title: section.metadata.title,
        subtitle: section.metadata.subtitle,
        authors,
        editors,
        web_url: section.metadata.web_url,
        identifiers: section.metadata.identifiers,
        published,
        lang: section.metadata.lang,
    };

    let mut content = vec![];

    // Store all endnote contents for this section. They will be rendered at the end of the section based on their order in the storage
    let mut endnote_storage: Vec<String> = vec![];

    for content_block in section.children{
        content.push(render_content_block(content_block, &mut endnote_storage));
    }

    let mut sub_sections = vec![];
    for sub_section in section.sub_sections{
        sub_sections.push(render_section(sub_section, data_storage.clone()));
    }

    let mut endnotes = vec![];
    for i in 0..endnote_storage.len(){
        endnotes.push((i+1, endnote_storage.get(i).unwrap().clone()))
    }

    PreparedSection{
        id: section.id.unwrap_or_default(),
        sub_sections,
        children: content,
        metadata,
        visible_in_toc: section.visible_in_toc,
        endnotes
    }
}

pub fn render_content_block(block: NewContentBlock, endnote_storage: &mut Vec<String>) -> PreparedContentBlock{
    let data: String = match block.data{
        BlockData::Paragraph {text} => {
            format!("<p>{}</p>", render_text(text, endnote_storage))
        }
        BlockData::Heading { text , level} => {
            format!("<h{}>{}</h{}>", level, render_text(text, endnote_storage), level)
        }
        BlockData::Raw { html } => {
            html
        }
        BlockData::List { style, items} => {
            let mut res = String::new();
            for item in items{
                res.push_str(&format!("<li>{}</li>", render_text(item, endnote_storage)));
            }
            if style == "ordered"{
                format!("<ol>{}</ol>", res)
            }else{
                format!("<ul>{}</ul>", res)
            }
        }
    };
    PreparedContentBlock{
        id: block.id,
        block_type: block.block_type,
        html: data
    }
}

pub fn render_text(text: String, endnote_storage: &mut Vec<String>) -> String{
    let re: Regex = Regex::new(r#"<span(?:[^>]*?\bnote-type="([^"]+)")?(?:[^>]*?\bnote-content="([^"]+)")?[^>]*>.*?</span>"#).unwrap(); //TODO: DO NOT RECOMPILE REGEX, it's bad for performance

    let res = re.replace_all(&text, |caps: &regex::Captures| {
        let note_type = caps.get(1).unwrap().as_str();
        let note_content = caps.get(2).unwrap().as_str();

        if(note_type == "endnote"){
            endnote_storage.push(note_content.to_string());
            return format!("<sup class=\"endnote\">[{}]</sup>", endnote_storage.len())
        }else if(note_type == "footnote"){
            return format!("<span class=\"footnote\">{}</span>", note_content)
        }else{
            String::new()
        }
    });
    res.to_string()
}