use std::sync::{Arc, RwLock};
use rocket::fs::TempFile;
use crate::data_storage::ProjectStorage;
use crate::settings::Settings;

pub struct ImportProcessor<'r>{
    pub settings: Settings,
    pub project_storage: Arc<ProjectStorage>,
    pub job_queue: RwLock<Vec<ImportJob<'r>>>,
    pub job_archive: RwLock<Vec<Arc<RwLock<ImportJob<'r>>>>>,
}

pub enum ImportStatus{
    Pending,
    Processing,
    Complete,
    Failed
}

pub enum ImportError{
    UnknownFileType,
    UnsupportedFileType,
}

pub struct ImportJob<'r>{
    pub id: uuid::Uuid,
    pub project_id: uuid::Uuid,
    pub length: usize,
    pub processed: usize,
    pub files_to_process: Vec<TempFile<'r>>,
    pub status: ImportStatus,
}

impl ImportProcessor<'_>{
    pub fn start(settings: Settings, project_storage: Arc<ProjectStorage>) -> Arc<ImportProcessor<'static>>{
        let processor = Arc::new(ImportProcessor{
            settings,
            project_storage,
            job_queue: RwLock::new(Vec::new()),
            job_archive: RwLock::new(Vec::new()),
        });

        let processor_clone = processor.clone();
        tokio::spawn(async move {
            let running_threads: Arc<std::sync::atomic::AtomicU64> = Arc::new(std::sync::atomic::AtomicU64::new(0));

            loop{
                // Check if there are any new jobs
                let job_queue_len = processor_clone.job_queue.read().unwrap().len();
                if job_queue_len > 0 && processor_clone.settings.max_import_threads > running_threads.load(std::sync::atomic::Ordering::Relaxed){
                    println!("Starting new import job...");
                    {
                        let mut job = processor_clone.job_queue.write().unwrap().pop().unwrap();
                        job.status = ImportStatus::Processing;
                        let job = Arc::new(RwLock::new(job));
                        processor_clone.job_archive.write().unwrap().push(job.clone());
                        processor_clone.process_job(job);
                    }
                }else{
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            }
        });

        processor
    }

    fn process_job(&self, mut job: Arc<RwLock<ImportJob<'_>>>){
        let job = job.clone();
        loop{
            let file = match job.write().unwrap().files_to_process.pop(){
                Some(f) => f,
                None => {
                    job.write().unwrap().status = ImportStatus::Complete;
                    break;
                }
            };

            //TODO: process file
            //TODO: add result to project storage

            job.write().unwrap().processed += 1;
        }
    }
}

pub fn convert_file(file: TempFile<'_>) -> Result<(), ImportError>{
    match file.content_type(){
        Some(content_type) => {
            let content_type = content_type.to_string();
            match content_type.as_str(){
                "text/x-tex" | "application/x-tex" => {
                    println!("Processing LaTeX file");
                },
                "application/vnd.oasis.opendocument.text" => {
                    println!("Processing ODT file");
                },
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => {
                    println!("Processing DOCX file");
                },
                "application/msword" => {
                    println!("Processing DOC file");
                },
                "application/epub+zip" => {
                    println!("Processing EPUB file");
                },
                "application/rtf" => {
                    println!("Processing RTF file");
                },
                "text/markdown" | "text/x-markdown" => {
                    println!("Processing Markdown file");
                },
                _ => {
                    println!("Unsupported file type: {}", content_type);
                    return Err(ImportError::UnsupportedFileType);
                }
            }
        },
        None => {
            println!("Unknown file type");
            return Err(ImportError::UnknownFileType);
        }
    }
    Ok(())
}