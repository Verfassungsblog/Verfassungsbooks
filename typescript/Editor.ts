/// <reference path="ProjectOverview.ts" />
namespace Editor{
    declare var project_id: string;

    // @ts-ignore
    export async function init() {
        let project_id = extract_project_id_from_url();
        try{
            let project = await load_project(project_id);
            globalThis.project_id = project_id;
            ProjectOverview.show_overview(project);
        }catch (e) {
            console.error("Couldn't load project: "+e);
        }
    }

    function extract_project_id_from_url(){
        let url = new URL(window.location.href);
        return url.pathname.split("/")[2];
    }

    // @ts-ignore
    async function load_project(project_id: string): Promise<Object> {
        const response = await fetch(`/api/projects/${project_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        if(!response.ok){
           throw new Error(`Failed to load project ${project_id}`);
        }else{
            return response.json();
        }
    }
}

// @ts-ignore
window.addEventListener("load", async function(){
    await Editor.init()
});
