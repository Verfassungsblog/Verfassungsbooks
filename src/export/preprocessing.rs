use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use handlebars::{Context, DirectorySourceOptions, Handlebars, Helper, HelperResult, JsonRender, Output, RenderContext, RenderError, RenderErrorReason};
use hyphenation::{Hyphenator, Load, Standard};
use image::{ImageOutputFormat, Luma};
use regex::Regex;
use rocket::form::validate::Contains;
use qrcode::QrCode;
use base64::prelude::*;
use hayagriva::{BibliographyDriver, BibliographyRequest, BufWriteFormat, CitationItem, CitationRequest};
use hayagriva::citationberg::{IndependentStyle, LocaleCode};
use crate::data_storage::{BibEntry, DataStorage, ProjectData};
use crate::export::{PreparedContentBlock, PreparedEndnote, PreparedLanguage, PreparedLicense, PreparedMetadata, PreparedProject, PreparedSection, PreparedSectionMetadata};
use crate::export::rendering_manager::RenderingError;
use crate::projects::{BlockData, Language, NewContentBlock, ProjectSettings, Section, SectionOrToc};
use crate::settings::Settings;
use crate::utils::csl::CslData;

pub fn render_project(prepared_project: PreparedProject, project_id: uuid::Uuid, template_id: uuid::Uuid, temp_dir: &Path, settings: &Settings) -> Result<(), RenderingError>{
    // Load templates
    let mut handlebars = Handlebars::new();
    match handlebars.register_templates_directory(Path::new(&format!("{}/templates/{}/templates", settings.data_path, template_id)), DirectorySourceOptions::default()){
        Ok(_) => {}
        Err(e) => {
            eprintln!("Couldn't load templates for export: {}", e);
            return Err(RenderingError::ErrorLoadingTemplate(e.to_string()));
        }
    }

    // Add custom handler for qr codes
    handlebars.register_helper("qrcode", Box::new(handlebars_qrcode_helper));

    // Copy output folder contents to working folder
    if let Err(e) =  crate::utils::fs_copy_recursive::copy_dir_all(format!("{}/templates/{}/output", settings.data_path, template_id), temp_dir){
        eprintln!("Couldn't copy template to output directory: {}", e);
        return Err(RenderingError::ErrorCopyingTemplate(e.to_string()));
    }

    // Copy uploads to working folder
    if let Err(e) =  crate::utils::fs_copy_recursive::copy_dir_all(format!("{}/projects/{}/uploads", settings.data_path, project_id), temp_dir){
        if e.kind() != std::io::ErrorKind::NotFound { // No uploads folder found, that's okay
            eprintln!("Couldn't copy uploads to output directory: {}", e);
            return Err(RenderingError::ErrorCopyingUploads(e.to_string()));
        }
    }

    let res = match handlebars.render("main", &prepared_project){
        Ok(res) => res,
        Err(e) => {
            eprintln!("Couldn't render template: {}", e);
            return Err(RenderingError::IoError(e.to_string()));
        }
    };
    if let Err(e) =  fs::write(temp_dir.join("index.html"), res){
        eprintln!("Couldn't write rendered template to file: {}", e);
        return Err(RenderingError::IoError(e.to_string()));
    }

    let mut args = vec!["build", "index.html", "-o", "output.pdf"];

    let path = settings.chromium_path.clone();
    let path_str = path.as_deref();
    if let Some(path_str) = path_str {
        args.push("--executable-browser");
        args.push(path_str);
        args.push("--timeout");
        args.push("480000");
    }

    let output =  Command::new("vivliostyle").current_dir(temp_dir).args(args).output();
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

fn handlebars_qrcode_helper(h: &Helper, _: &Handlebars, _: &Context, rc: &mut RenderContext, out: &mut dyn Output) -> HelperResult{
    let param = h.param(0).ok_or(RenderErrorReason::ParamNotFoundForIndex("qrcode", 0))?;

    let val : String = param.value().render();

    let qr_code = match QrCode::new(val.to_string()){
        Ok(qr_code) => qr_code,
        Err(e) => {
            eprintln!("Couldn't create qr code: {}", e);
            return Err(RenderError::from(RenderErrorReason::Other(format!("Couldn't create qr code: {}", e))));
        }
    };

    let image = qr_code.render::<Luma<u8>>().build();
    let image = image::DynamicImage::from(image);
    let mut buf = Cursor::new(Vec::new());
    match image.write_to(&mut buf, ImageOutputFormat::Jpeg(100)){
        Ok(_) => {}
        Err(e) => {
            eprintln!("Couldn't write qr code to buffer: {}", e);
            return Err(RenderError::from(RenderErrorReason::Other(format!("Couldn't write qr code to buffer: {}", e))));
        }
    }
    let encoded_image = BASE64_STANDARD.encode(buf.get_ref());

    out.write(&format!("<img class=\"qrcode\" src=\"data:image/jpeg;base64,{}\" alt=\"QR Code\" />", encoded_image))?;
    Ok(())
}

pub fn prepare_project(project_data: ProjectData, data_storage: Arc<DataStorage>, csl_data: Arc<CslData>) -> Result<PreparedProject, RenderingError>{
    let citation_bib = render_citations(&project_data, csl_data);

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

    let mut data = vec![];
    for section in project_data.sections{
        if let SectionOrToc::Section(section) = section{
            data.push(render_section(section, data_storage.clone(), &citation_bib))
        }
    }

    for section in data.iter() {
        add_remaining_authors_editors_from_section(section,&mut authors, &mut editors);
    }

    // Sort authors and editors by last name
    authors.sort_by(|a, b| a.last_names.cmp(&b.last_names));
    editors.sort_by(|a, b| a.last_names.cmp(&b.last_names));

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

    Ok(PreparedProject{
        metadata,
        settings: project_data.settings,
        data,
    })
}

fn add_remaining_authors_editors_from_section(section: &PreparedSection, authors: &mut Vec<crate::projects::Person>, editors: &mut Vec<crate::projects::Person>){
    for author in section.metadata.authors.iter(){
        if !authors.contains(author){
            authors.push(author.clone());
        }
    }
    for editor in section.metadata.editors.iter(){
        if !editors.contains(editor){
            editors.push(editor.clone());
        }
    }
    for sub_section in section.sub_sections.iter(){
        add_remaining_authors_editors_from_section(sub_section, authors, editors);
    }
}

pub fn render_section(section: Section, data_storage: Arc<DataStorage>, citation_bib: &HashMap<String, String>) -> PreparedSection{
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

    // Load hyphenation dictionary for the language
    let dict = match &section.metadata.lang{
        Some(lang) => {
            match lang{
                Language::DE => Standard::from_embedded(hyphenation::Language::German1996).unwrap(),
                Language::EN => Standard::from_embedded(hyphenation::Language::EnglishGB).unwrap()
            }
        }
        None => Standard::from_embedded(hyphenation::Language::EnglishGB).unwrap()
    };

    let lang = match section.metadata.lang{
        Some(lang) => {
            match lang{
                Language::DE => PreparedLanguage{de: true, en: false},
                Language::EN => PreparedLanguage{de: false, en: true}
            }
        }
        None => PreparedLanguage{de: false, en: false}
    };

    let subtitle = match section.metadata.subtitle{
        Some(subtitle) => Some(hyphenate_text(subtitle, &dict)),
        None => None
    };

    let metadata = PreparedSectionMetadata{
        title: hyphenate_text(section.metadata.title.clone(), &dict),
        subtitle,
        authors,
        editors,
        web_url: section.metadata.web_url,
        identifiers: section.metadata.identifiers,
        published,
        lang,
    };

    let mut content = vec![];

    // Store all endnote contents for this section. They will be rendered at the end of the section based on their order in the storage
    let mut endnote_storage: Vec<String> = vec![];

    for content_block in section.children{
        content.push(render_content_block(content_block, &mut endnote_storage, &dict, &citation_bib));
    }

    let mut sub_sections = vec![];
    for sub_section in section.sub_sections{
        sub_sections.push(render_section(sub_section, data_storage.clone(), &citation_bib));
    }

    let mut endnotes = vec![];
    for i in 0..endnote_storage.len(){
        endnotes.push(PreparedEndnote{ num: i+1, content: endnote_storage.get(i).unwrap().clone() });
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

pub fn render_content_block(block: NewContentBlock, endnote_storage: &mut Vec<String>, dict: &Standard, citation_bib: &HashMap<String, String>) -> PreparedContentBlock{
    let css_classes_raw = block.css_classes.join(" ");
    let css_classes = if block.css_classes.len() > 0{
        format!(" class='{}'", block.css_classes.join(" "))
    }else{
        String::new()
    };
    let data: String = match block.data{
        BlockData::Paragraph {text} => {
            format!("<p{}>{}</p>", css_classes, render_text(text, endnote_storage, dict, citation_bib))
        }
        BlockData::Heading { text , level} => {
            format!("<h{}{}>{}</h{}>", level, css_classes, render_text(text, endnote_storage, dict, citation_bib), level)
        }
        BlockData::Raw { html } => {
            html
        }
        BlockData::List { style, items} => {
            let mut res = String::new();
            for item in items{
                res.push_str(&format!("<li>{}</li>", render_text(item, endnote_storage, dict, citation_bib)));
            }
            if style == "ordered"{
                format!("<ol{}>{}</ol>", css_classes, res)
            }else{
                format!("<ul{}>{}</ul>", css_classes, res)
            }
        },
        BlockData::Quote{text, caption, alignment} => {
            format!("<blockquote class=\"align-{} {}\"><p>{}</p><footer>{}</footer></blockquote>", alignment, css_classes_raw, render_text(text, endnote_storage, dict, citation_bib), render_text(caption, endnote_storage, dict, citation_bib))
        }
        BlockData::Image {file, caption, with_border, with_background, stretched} => {
            // We use filename since all images are copied from te uploads directory to our temporary working dir and file.url represents the public url
            format!("<img src=\"{}\" alt=\"{}\" {}/>", file.filename, caption.unwrap_or_default(), css_classes)
        }
    };
    PreparedContentBlock{
        id: block.id,
        block_type: block.block_type,
        html: data
    }
}

pub fn render_text(text: String, endnote_storage: &mut Vec<String>, dict: &Standard, citation_bib: &HashMap<String, String>) -> String{
    let re: Regex = Regex::new(r#"<span(?:[^>]*?\bnote-type="([^"]+)")?(?:[^>]*?\bnote-content="([^"]+)")?[^>]*>.*?</span>"#).unwrap(); //TODO: DO NOT RECOMPILE REGEX, it's bad for performance

    let res = re.replace_all(&text, |caps: &regex::Captures| {
        let note_type = match caps.get(1){
            Some(note_type) => note_type.as_str(),
            None => return String::new()
        };
        let note_content = match caps.get(2){
            Some(note_content) => note_content.as_str(),
            None => return String::new()
        };

        if note_type == "endnote" {
            endnote_storage.push(note_content.to_string());
            return format!("<sup class=\"endnote\"><a href=\"#note-{}\">{}</a></sup>", endnote_storage.len(), endnote_storage.len())
        }else if note_type == "footnote" {
            let uuid = uuid::Uuid::new_v4();
            return format!("<span class=\"footnote\" id=\"footnote-{}\"><a class=\"footnote-marker\" href=\"#footnote-call-{}\"></a>{}</span><a class=\"footnote-call\" href=\"#footnote-{}\" id=\"footnote-call-{}\"></a>", uuid, uuid,  note_content, uuid, uuid)
        }else{
            String::new()
        }
    });

    let re2 = Regex::new(r#"<customstyle(?:[^>]*?\binline-style="([^"]*?)")?(?:[^>]*?\bclasses="([^"]*?)")?[^>]*>(.*?)</customstyle>"#).unwrap();
    let binding = res.to_string();
    let res2 = re2.replace_all(&binding, |caps: &regex::Captures| {
        let inline_style = caps.get(1).map_or("", |m| m.as_str());
        let classes = caps.get(2).map_or("", |m| m.as_str());
        let content = caps.get(3).map_or("", |m| m.as_str());
        format!(r#"<span class="{}" style="{}">{}</span>"#, classes, inline_style, content)
    });

    let re3 = Regex::new(r#"<citation data-key="([^"]*)">C</citation>"#).unwrap();
    let binding = res2.to_string();
    let res3 = re3.replace_all(&binding, |caps: &regex::Captures| {
        let key = match caps.get(1){
            Some(key) => key.as_str(),
            None => return String::new()
        };

        // TODO: add setting if citations should be rendered as endnotes, in text or as footnotes
        match citation_bib.get(key){
            Some(citation) => {
                endnote_storage.push(citation.clone());
                format!("<sup class=\"endnote\"><a href=\"#note-{}\">{}</a></sup>", endnote_storage.len(), endnote_storage.len())
            },
            None => {
                eprintln!("Citation with key {} not found", key);
                String::from("!!INVALID CITATION!!")
            }
        }
    });
    hyphenate_text(res3.to_string(), dict)
}

pub fn render_citations(project: &ProjectData, csl_data: Arc<CslData>) -> HashMap<String, String>{
    //TODO: remove unused citation entrys to avoid bibliography entries with no citations
    let mut driver: BibliographyDriver<hayagriva::Entry> = BibliographyDriver::new();
    let mut res = HashMap::new();

    let mut bib = hayagriva::Library::new();
    for (_, entry) in project.bibliography.iter() {
        let entry: hayagriva::Entry = entry.clone().into();
        bib.push(&entry);
    }

    let mut items = Vec::new();
    for (entry) in bib.iter(){
        let cit_entry = CitationItem::with_entry(entry);
        items.push(cit_entry);
    }

    let style = match &project.settings{
        None => {
            csl_data.styles.iter().next().expect("No CSL styles found").1
        }
        Some(settings) => {
            match &settings.csl_style{
                None => {
                    csl_data.styles.iter().next().expect("No CSL styles found").1
                }
                Some(style) => {
                    match csl_data.styles.get(style){
                        None => {
                            eprintln!("Couldn't find CSL style with id {}, using first csl style", style);
                            csl_data.styles.iter().next().expect("No CSL styles found").1
                        }
                        Some(style) => {
                            style
                        }
                    }
                }
            }
        }
    };

    for entry in items{
        driver.citation(CitationRequest::from_items(vec![entry], style, csl_data.locales.as_slice()));
    }

    let result = driver.finish(BibliographyRequest{
        style,
        locale: Some(LocaleCode("en-GB".to_string())), //TODO. set based on local
        locale_files: &csl_data.locales.as_slice(),
    });
    for (i, citation) in result.citations.iter().enumerate(){
        match project.bibliography.iter().nth(i){
            Some((key, _)) => {
                println!("Citation with index {} has corresponding bibliography entry {}", i, key);
                let mut content = String::new();
                citation.citation.write_buf(&mut content, BufWriteFormat::Html).unwrap();
                res.insert(key.to_string(),content);
            }
            None => {
                eprintln!("Citation with index {} has no corresponding bibliography entry", i);
            }
        }
    }
    res
}

pub fn hyphenate_text(text: String, dict: &hyphenation::Standard) -> String{
    let mut res = String::new();
    let mut word_iter = text.split_whitespace().peekable();
    while let Some(word) = word_iter.next(){
        if word.starts_with("class=\"") || word.contains("<") || word.contains(">") || word.contains("=") || word.contains("&"){
            res.push_str(&format!("{} ", word));
            continue
        }
        let hyphenated = dict.hyphenate(word);

        let mut word_res = String::new();
        let mut iter = hyphenated.into_iter().segments().peekable();
        while let Some(segment) = iter.next(){
            word_res.push_str(&segment);
            if iter.peek().is_some(){
                word_res.push('\u{00ad}');
            }
        }

        res.push_str(&word_res);
        if word_iter.peek().is_some(){
            res.push(' ');
        }
    }
    res
}

// Test hyphenation
#[cfg(test)]
mod tests {
    use hyphenation::extended::Extended;
    use hyphenation::{Load, Standard};
    use super::*;

    #[test]
    fn test_hyphenation(){
        let dict = Standard::from_embedded(hyphenation::Language::German1996).unwrap();
        let text = "Grundstücksverkehrsgenehmigungszuständigkeitsübertragungsverordnung";
        let hyphenated = hyphenate_text(text.to_string(), &dict);
        assert_eq!(hyphenated, "Grund\u{ad}stücks\u{ad}ver\u{ad}kehrs\u{ad}ge\u{ad}neh\u{ad}mi\u{ad}gungs\u{ad}zu\u{ad}stän\u{ad}dig\u{ad}keits\u{ad}über\u{ad}tra\u{ad}gungs\u{ad}ver\u{ad}ord\u{ad}nung");
    }
}