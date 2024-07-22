export async function send_update_content_blocks(project_id: string, section_path: string, data: any){
    const response = await fetch(`/api/projects/`+project_id+`/sections/`+section_path+"/content_blocks/", {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if(!response.ok){
        throw new Error(`Failed to update content block: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            console.error(response_data["error"]);
            throw new Error(`Failed to save content blocks: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_get_content_blocks(project_id: string, section_path: string){
    const response = await fetch(`/api/projects/`+project_id+`/sections/`+section_path+"/content_blocks/", {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if(!response.ok){
        throw new Error(`Failed to get content blocks: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to get content blocks: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}


export async function send_render_project(project_id: string){
    const response = await fetch(`/api/projects/`+project_id+`/render`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if(!response.ok){
        throw new Error(`Failed to render project: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to render project: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_get_rendering_status(render_id: string){
    const response = await fetch(`/api/renderings/`+render_id+`/status`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if(!response.ok){
        throw new Error(`Failed to render project: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to render project: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_add_user(user_data: object){
    const response = await fetch(`/api/users/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user_data)
    });
    if(!response.ok){
        throw new Error(`Failed to add user: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to add user: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_update_user(user_id: string, patch_data: object){
    const response = await fetch(`/api/users/`+user_id, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch_data)
    });
    if(!response.ok){
        throw new Error(`Failed to update user: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to update user: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_delete_user(user_id: string){
    const response = await fetch(`/api/users/`+user_id, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if(!response.ok){
        throw new Error(`Failed to delete user: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to delete user: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_import_from_upload(data: any){
    const response = await fetch(`/api/import/upload`, {
        method: 'POST',
        body: data,
    });
    if(!response.ok){
        throw new Error(`Failed to upload: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to upload: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export async function send_add_new_bib_entry(data: any, project_id: string){
    const response = await fetch(`/api/projects/`+project_id+`/bibliography`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }

    });
    if(!response.ok){
        throw new Error(`Failed to add new bib entry: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to add new bib entry: `+ Object.keys(response_data["error"])[0]+" "+Object.values(response_data["error"])[0]);
        }else{
            return response_data;
        }
    }
}

export async function send_get_bib_list(project_id: string){
    const response = await fetch(`/api/projects/`+project_id+`/bibliography`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }

    });
    if(!response.ok){
        throw new Error(`Failed to get bib entries: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to get bib entries: `+ Object.keys(response_data["error"])[0]+" "+Object.values(response_data["error"])[0]);
        }else{
            return response_data;
        }
    }
}

export async function send_get_bib_entry(key: string, project_id: string){
    const response = await fetch(`/api/projects/`+project_id+`/bibliography/`+key, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }

    });
    if(!response.ok){
        throw new Error(`Failed to get bib entry: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to get bib entry: `+ Object.keys(response_data["error"])[0]+" "+Object.values(response_data["error"])[0]);
        }else{
            return response_data;
        }
    }
}

export async function update_bib_entry(data: any, key: string, project_id: string){
    const response = await fetch(`/api/projects/`+project_id+`/bibliography/`+key, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }

    });
    if(!response.ok){
        throw new Error(`Failed to update bib entry: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to update bib entry: `+ Object.keys(response_data["error"])[0]+" "+Object.values(response_data["error"])[0]);
        }else{
            return response_data;
        }
    }
}

export async function send_poll_import_status(id: string){
    const response = await fetch(`/api/import/status/`+id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }

    });
    if(!response.ok){
        throw new Error(`Failed to get import status: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            console.error(response_data["error"]);
            throw new Error(`Failed to get import status: `+ Object.keys(response_data["error"])[0]+" "+Object.values(response_data["error"])[0]);
        }else{
            return response_data;
        }
    }
}


export async function send_import_from_wordpress(data: any){
    const response = await fetch(`/api/import/wordpress`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if(!response.ok){
        throw new Error(`Failed to upload: ${response.status}`);
    }else{
        let response_data = await response.json();
        if(response_data.hasOwnProperty("error")) {
            throw new Error(`Failed to upload: ${response_data["error"]}`);
        }else{
            return response_data;
        }
    }
}

export type ExportStepData =
    | { Raw: RawExportStep }
    | { Vivliostyle: VivliostyleExportStep }
    | { Pandoc: PandocExportStep };
export interface ExportStep {
    id: string;
    name: string;
    data: ExportStepData;
    files_to_keep: string[];
}

export interface RawExportStep {
    entry_point: string;
    output_file: string;
}

export interface VivliostyleExportStep {
    press_ready: boolean;
    input_file: string;
    output_file: string;
}

export interface PandocExportStep {
    input_file: string;
    input_format: string;
    output_file: string;
    output_format: string;
    shift_heading_level_by?: number;
    metadata_file?: string;
    epub_cover_image_path?: string;
    epub_title_page?: boolean;
    epub_metadata_file?: string;
    epub_embed_fonts?: string[];
}

export type ApiResult<T> = {
    error?: ApiError;
    data?: T;
  }
  
  export type ApiError = 
  | { NotFound?: never }
  | { BadRequest?: string }
  | { Unauthorized?: never }
  | { InternalServerError?: never }
  | { Conflict?: string }
  | { Other?: string };

  export function apiErrorToString(error: ApiError): string {
    let errorType = Object.keys(error)[0] as keyof ApiError;
    let errorMessage = error[errorType];
    return errorMessage ? `${errorMessage}` : errorType;
}

    interface ExportFormat {
        slug: string;
        name: string;
        export_type: ExportType;
        used_as_preview: boolean;
        add_cover: boolean;
        add_backcover: boolean;
    }

    enum ExportType {
        PDF = "PDF",
        DOCX = "DOCX",
        DOC = "DOC",
        HTML = "HTML",
        LATEX = "LATEX",
        EPUB = "EPUB",
        ODT = "ODT",
        MOBI = "MOBI",
        XML = "XML",
        JSON = "JSON",
        PLAIN = "PLAIN"
    }

    export interface ProjectTemplateV2 {
        id: string;
        name: string;
        description: string;
        export_formats: Record<string, ExportFormat>;
    }

    export interface AssetList {
        assets: Asset[];
    }

    export interface AssetFolder {
        name: string;
        assets: Asset[];
    }

    export interface AssetFile {
        name: string;
        mime_type?: string;
    }

    export type Asset = AssetFolder | AssetFile;

export function TemplateAPI(){
    
    async function read_template(template_id: string) {
        const response = await fetch(`/api/templates/${template_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    
        if (!response.ok) {
            throw new Error(`Failed to get template: ${response.status}`);
        }
    
        const response_data: ApiResult<ProjectTemplateV2> = await response.json();
    
        if (response_data.error) {
            throw new Error(`Failed to get template: ${apiErrorToString(response_data.error)}`);
        }
        if (!response_data.data) {
            throw new Error('No data received');
        }
    
        return response_data.data;
    };
    
    async function update_template(template: ProjectTemplateV2) {
        const response = await fetch(`/api/templates/${template.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(template)
        });
    
        if (!response.ok) {
            throw new Error(`Failed to update template: ${response.status}`);
        }
    
        const response_data: ApiResult<ProjectTemplateV2> = await response.json();
    
        if (response_data.error) {
            throw new Error(`Failed to update template: ${apiErrorToString(response_data.error)}`);
        }
    
        return response_data.data;
    }

    async function list_global_assets(template_id: string){
        const response = await fetch(`/api/templates/${template_id}/assets`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list global assets: ${response.status}`);
        }

        const response_data: ApiResult<AssetList> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to list global assets: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function create_folder(template_id: string, name: string){
        const response = await fetch(`/api/templates/${template_id}/assets/folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        console.log(response_data);
        if (response_data.error) {
            throw new Error(`Failed to create folder: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }
    async function upload_file(template_id: string, file: File){
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/templates/${template_id}/assets/file`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to upload file: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }
    async function move_global_asset(template_id: string, old_path: string, new_path: string, overwrite_option: boolean){
        const response = await fetch(`/api/templates/${template_id}/assets/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_path: old_path,
                new_path: new_path,
                overwrite: overwrite_option
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to move asset: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to move asset: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function delete_assets(template_id: string, paths: string[]){
        const response = await fetch(`/api/templates/${template_id}/assets/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: paths
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to delete assets: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function delete_assets_for_export_formats(template_id: string, slug: string, paths: string[]){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: paths
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to delete assets: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            console.log(response_data.error);
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function get_asset_file(template_id: string, path: string){
        const response = await fetch(`/api/templates/${template_id}/assets/files/${path}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get asset file: ${response.status}`);
        }
        const contentType = response.headers.get('Content-Type');
        console.log("Content type: "+contentType)

        let result;
        if (contentType && contentType.startsWith('text/')) {
            // If it's a text file, read it as text
            result = {
                type: 'text',
                data: await response.text(),
            };
        } else {
            // If it's not a text file, get it as a blob
            result = {
                type: 'blob',
                data: await response.blob(),
            };
        }
        return result;
    }

    async function get_asset_file_for_export_format(template_id: string, slug: string, path: string){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/files/${path}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get asset file: ${response.status}`);
        }
        const contentType = response.headers.get('Content-Type');
        console.log("Content type: "+contentType)

        let result;
        if (contentType && contentType.startsWith('text/')) {
            // If it's a text file, read it as text
            result = {
                type: 'text',
                data: await response.text(),
            };
        } else {
            // If it's not a text file, get it as a blob
            result = {
                type: 'blob',
                data: await response.blob(),
            };
        }
        return result;
    }

    async function update_asset_text_file(template_id: string, path: string, content: string){
        const response = await fetch(`/api/templates/${template_id}/assets/files/${path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update asset: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function update_asset_text_file_for_export_format(template_id: string, path: string, slug: string, content: string){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/files/${path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update asset: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function create_export_format(template_id: string, name: string): Promise<any>{
        let data = {
            name: name,
            export_steps: [] as any[],
            output_files: [] as any[],
            slug: slugify(name)
        }

        const response = await fetch(`/api/templates/${template_id}/export_formats/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to create export format: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function delete_export_format(template_id: string, slug: string): Promise<any>{

        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete export format: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function list_export_format_assets(template_id: string, slug: string){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list global assets: ${response.status}`);
        }

        const response_data: ApiResult<AssetList> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to list global assets: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function upload_file_for_export_format(template_id: string, slug: string, file: File){
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/file`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to upload file: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function create_folder_for_export_format(template_id: string, name: string, slug: string){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        console.log(response_data);
        if (response_data.error) {
            throw new Error(`Failed to create folder: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }
    async function move_asset_for_export_format(template_id: string, old_path: string, new_path: string, slug: string, overwrite_option: boolean){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/assets/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_path: old_path,
                new_path: new_path,
                overwrite: overwrite_option
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to move asset: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to move asset: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function create_export_step(template_id: string, export_format_slug: string, export_step: ExportStep): Promise<any>{
        const response = await fetch(`/api/templates/${template_id}/export_formats/${export_format_slug}/export_steps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(export_step)
        });

        if (!response.ok) {
            throw new Error(`Failed to create export step: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function delete_export_step(template_id: string, slug: string, step_id: string): Promise<any>{

        const response =  await fetch(`/api/templates/${template_id}/export_formats/${slug}/export_steps/${step_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete export step: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function update_export_step(template_id: string, export_format_slug: string, export_step: ExportStep): Promise<any>{
        const response = await fetch(`/api/templates/${template_id}/export_formats/${export_format_slug}/export_steps/${export_step.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(export_step)
        });

        if (!response.ok) {
            throw new Error(`Failed to update export step: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function move_export_step_after(template_id: string, export_format_slug: string, export_step_id: string, move_after: string|null): Promise<any>{
        let data = {
            move_after: move_after
        };
        const response = await fetch(`/api/templates/${template_id}/export_formats/${export_format_slug}/export_steps/${export_step_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to move export step: ${response.status}`);
        }

        const response_data: ApiResult<null> = await response.json();

        if (response_data.error) {
            throw new Error(`${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }

    async function list_export_steps(template_id: string, slug: string){
        const response = await fetch(`/api/templates/${template_id}/export_formats/${slug}/export_steps`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list export steps: ${response.status}`);
        }

        const response_data: ApiResult<AssetList> = await response.json();

        if (response_data.error) {
            throw new Error(`Failed to list export steps: ${apiErrorToString(response_data.error)}`);
        }

        return response_data.data;
    }
    return{
        read_template,
        update_template,
        create_folder,
        upload_file,
        list_global_assets,
        move_global_asset,
        delete_assets,
        get_asset_file,
        update_asset_text_file,
        create_export_format,
        delete_export_format,
        list_export_format_assets,
        get_asset_file_for_export_format,
        upload_file_for_export_format,
        delete_assets_for_export_formats,
        create_folder_for_export_format,
        move_asset_for_export_format,
        update_asset_text_file_for_export_format,
        create_export_step,
        delete_export_step,
        update_export_step,
        move_export_step_after,
        list_export_steps
    }
}

function slugify(text: string): string {
    return text
        .trim() // trim leading and trailing spaces
        .toLowerCase() // convert text to lowercase
        .replace(/\s+/g, '-') // replace spaces with -
        .normalize('NFD') // decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/[^a-z0-9 -]/g, '') // remove invalid characters
        .replace(/-+/g, '-'); // collapse multiple -'s
}