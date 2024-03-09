/// <reference path="Editor-old.ts" />
namespace Editor{
    export namespace Sidebar{
        var current_content_block_settings_shown = null;

        // @ts-ignore
        export async function build_sidebar(){
            current_content_block_settings_shown = null;
            let data = {};
            let get_content_promise = send_get_contents();
            let get_metadata_promise = Editor.ProjectOverview.load_project_metadata(globalThis.project_id);

            try {
                // @ts-ignore
                let res = await Promise.all([get_content_promise, get_metadata_promise]);
                data["contents"] = res[0]["data"];
                data["metadata"] = res[1]["data"];
            }catch(e){
                console.error(e);
                Tools.show_alert("Failed to load sidebar", "danger");
                return;
            }

            let sidebar = document.getElementById("editor-sidebar");

            console.log(data);
            // @ts-ignore
            sidebar.innerHTML = Handlebars.templates.editor_sidebar(data);

            let add_content_button = document.getElementById("editor_sidebar_add_section");
            add_content_button.addEventListener("click", add_section_btn_lstnr)
            add_dropzones();
            add_draggables();
            add_toc_listeners();
            // @ts-ignore
            window.add_import_listeners();
            document.getElementById("editor_sidebar_project_title").addEventListener("click", ProjectOverview.show_overview);
        }

        // @ts-ignore
        export async function show_content_block_settings_sidebar(caller){
            let content_block = caller.target.closest(".content_block");
            let id = content_block.getAttribute("data-block-id");

            if(current_content_block_settings_shown !== id) {
                current_content_block_settings_shown = id;
            }else{ // We already have the settings for this content block shown, so we do nothing
                return;
            }

            let data = await send_get_content_block(globalThis.section_path, id);

            if(data.content.hasOwnProperty("Heading")){
                let level = data.content["Heading"]["level"];
                data.content["Heading"]["level_extra"] = {};
                data.content["Heading"]["level_extra"]["level"+level] = true;
            }

            let sidebar = document.getElementById("editor-sidebar");
            // @ts-ignore
            sidebar.innerHTML = Handlebars.templates.editor_sidebar_content_block_settings(data);

            // Add back listener:
            document.getElementById("editor_sidebar_content_block_settings_back").addEventListener("click", build_sidebar);
            // @ts-ignore
            document.getElementById("editor_sidebar_content_block_settings_delete").addEventListener("click", async function (){
                try{
                    await send_delete_content_block(globalThis.section_path, id);
                    // Remove content block from section view
                    content_block.remove();
                    await build_sidebar();
                }catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to delete content block", "danger");
                }
            });

            // Add update listeners:
            if(data.content.hasOwnProperty("Heading")){
                // @ts-ignore
                document.getElementById("editor_sidebar_content_block_settings_heading_level_select").addEventListener("change", async function (){
                    let new_level = parseInt((<HTMLSelectElement>document.getElementById("editor_sidebar_content_block_settings_heading_level_select")).value);
                    console.log(new_level);
                    try{
                        let block =  {
                            content: {
                                Heading: {
                                    level: new_level,
                                }
                            }
                        }
                        await patch_content_block(globalThis.section_path, id, block);
                        // Change level of heading in section view
                        let input = content_block.getElementsByClassName("content_block_heading_input")[0];
                        input.outerHTML = input.outerHTML.replace(/<h[1-6]/, "<h"+new_level);
                        input.setAttribute("data-level", new_level.toString());
                        Tools.show_alert("Updated content block", "success");
                    }catch (e) {
                        console.error(e);
                        Tools.show_alert("Failed to update content block", "danger");
                    }
                });
            }
        }

        async function patch_content_block(section_path, block_id, patch_data){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patch_data)
            });
            if(!response.ok){
                throw new Error(`Failed to patch content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to patch content block: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        async function send_get_content_block(section_path, block_id){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to get content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to get content block: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        async function send_delete_content_block(section_path, block_id){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to delete content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to delete content block: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        function add_toc_listeners(){

            // @ts-ignore
            for(let toc_item of document.getElementsByClassName("editor_sidebar_contents_section")){
                toc_item.addEventListener("click", toc_click_listener);
            }
        }

        // @ts-ignore
        async function toc_click_listener(e){
            let target = e.target;
            if(!target.classList.contains("editor_sidebar_contents_section_wrapper")){
                target = target.closest(".editor_sidebar_contents_section_wrapper");
            }
            let section_id = target.getAttribute("data-section-id") || null;

            if(section_id === null){
                console.error("Section has no id");
                return;
            }

            // Get path of section
            let path : string = section_id;

            // Append parents to path, until we reach the root
            while (target.parentElement.closest(".editor_sidebar_contents_section_wrapper") !== null){
                let parent_section_id = target.parentElement.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id") || null;
                if(parent_section_id === null){
                    console.error("Parent section has no id");
                    return;
                }

                // Append parent section id to path
                path = parent_section_id + ":" + path;

                // Go up one level
                target = target.parentElement.closest(".editor_sidebar_contents_section_wrapper");
            }

            globalThis.section_id = section_id;
            globalThis.section_path = path;
            await Editor.SectionView.show_section_view();
        }
        function add_draggables(){
            let dragstart = function(ev){
                console.log(ev.target.id);
                ev.dataTransfer.setData("text", ev.target.id);
            }
            // @ts-ignore
            for(let draggable of document.getElementsByClassName("editor_sidebar_contents_section_wrapper")){
                draggable.addEventListener("dragstart", dragstart);
            }
        }
        function add_dropzones(){
            let dragover = function(ev){
                ev.preventDefault();
            }

            let dragenter = function(ev){
                if(ev.target.classList.contains("editor_sidebar_contents_section_after_dropzone")){
                    ev.target.classList.add("active-border-bottom");
                }
            }

            let dragleave = function(ev){
                if(ev.target.classList.contains("editor_sidebar_contents_section_after_dropzone")){
                    ev.target.classList.remove("active-border-bottom");
                }
            }

            // @ts-ignore
            let drop_after = async function(ev){
                ev.preventDefault();
                ev.target.classList.remove("active-border-bottom");
                let data = ev.dataTransfer.getData("text");
                console.log("Moving element "+data+" after element"+ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));

                let section_id = document.getElementById(data).getAttribute("data-section-id");

                try{
                    await send_move_section_after(section_id, ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                    ev.target.closest(".editor_sidebar_contents_section_wrapper").getElementsByClassName("editor_sidebar_contents_section_children")[0].appendChild(document.getElementById(data));
                }catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to move section", "danger");
                }

                ev.target.closest(".editor_sidebar_contents_section_wrapper").after(document.getElementById(data));
            }

            // @ts-ignore
            let drop_on = async function(ev){
                ev.preventDefault();
                ev.target.classList.remove("active-border-bottom");

                let data = ev.dataTransfer.getData("text");
                console.log("Moving element "+data+" ON element"+ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));

                let section_id = document.getElementById(data).getAttribute("data-section-id");
                try{
                    await send_move_section_to_child(section_id, ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                    ev.target.closest(".editor_sidebar_contents_section_wrapper").getElementsByClassName("editor_sidebar_contents_section_children")[0].appendChild(document.getElementById(data));
                }catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to move section", "danger");
                }
            }

            // Add after section dropzones
            // @ts-ignore
            for(let dropzone of document.getElementsByClassName("editor_sidebar_contents_section_after_dropzone")){
                dropzone.addEventListener("dragover", dragover);
                dropzone.addEventListener("drop", drop_after);
                dropzone.addEventListener("dragenter", dragenter);
                dropzone.addEventListener("dragleave", dragleave);
            }

            // Add make to children (drop on element) dropzones
            // @ts-ignore
            for(let dropzone of document.getElementsByClassName("editor_sidebar_contents_section")){
                dropzone.addEventListener("dragover", dragover);
                dropzone.addEventListener("drop", drop_on);
            }
        }

        // @ts-ignore
        async function add_section_btn_lstnr(){
            let title = (<HTMLInputElement>document.getElementById("editor_sidebar_section_name")).value || null;
            if(title === null){
                Tools.show_alert("Please enter a title", "danger");
                return;
            }
            let data = {
                "Section": {
                    "children": [],
                    "sub_sections": [],
                    "visible_in_toc": true,
                    "css_classes": [],
                    "metadata": {
                        "title": title,
                        "authors": [],
                        "editors": [],
                        "identifiers": [],
                    }
                }
            };

            try {
                let section = await send_add_section(data);
                await build_sidebar();
            }catch (e) {
                console.error(e);
                Tools.show_alert("Failed to add section", "danger");
            }
        }

        async function send_move_section_after(section_id, after_section_id){
            const response = await fetch(`/api/projects/${globalThis.project_id}/contents/${section_id}/move/after/${after_section_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to move section: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to move section: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        async function send_move_section_to_child(section_id, parent_id){
            const response = await fetch(`/api/projects/${globalThis.project_id}/contents/${section_id}/move/child_of/${parent_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to move section: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to move section: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        async function send_add_section(data){
            const response = await fetch(`/api/projects/${globalThis.project_id}/contents/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if(!response.ok){
                throw new Error(`Failed to add section: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to add section: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        async function send_get_contents(){
            const response = await fetch(`/api/projects/${globalThis.project_id}/contents/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to get contents: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to get contents: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }
    }
}