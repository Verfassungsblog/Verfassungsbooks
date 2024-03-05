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