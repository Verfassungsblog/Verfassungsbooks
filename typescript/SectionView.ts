/// <reference path="Editor.ts" />
namespace Editor{
    export namespace SectionView{

        declare var section_data: object | null;

        // @ts-ignore
        export async function show_section_view(){
            try {
                section_data = await send_get_section(globalThis.section_path);
                console.log(section_data);

                // Retrieve details for authors and editors
                if (section_data["metadata"]["authors"] != null) {
                    let promises = [];

                    for (let author of section_data["metadata"]["authors"]) {
                        promises.push(Editor.ProjectOverview.send_get_person_request(author));
                    }

                    Tools.start_loading_spinner();

                    try {
                        // @ts-ignore
                        let values = await Promise.all(promises);
                        Tools.stop_loading_spinner();

                        console.log(values);
                        if (values.length !== section_data["metadata"]["authors"].length) {
                            console.log("Failed to load all authors");
                            Tools.show_alert("Failed to load all authors", "danger");
                        } else {
                            // We need to use a different key for the authors with details, because the key "authors" is used for the ids and used to patch the section
                            section_data["metadata"]["authors_with_details"] = values;
                        }
                    }catch(e){
                        Tools.stop_loading_spinner();
                        console.log(e);
                        Tools.show_alert("Failed to load all authors", "danger");
                    }
                }
                if (section_data["metadata"]["editors"] != null) {
                    let promises = [];

                    for (let editor of section_data["metadata"]["editors"]) {
                        promises.push(Editor.ProjectOverview.send_get_person_request(editor));
                    }

                    Tools.start_loading_spinner();

                    try {
                        // @ts-ignore
                        let values = await Promise.all(promises);
                        Tools.stop_loading_spinner();

                        console.log(values);
                        if (values.length !== section_data["metadata"]["editors"].length) {
                            console.log("Failed to load all editors");
                            Tools.show_alert("Failed to load all editors", "danger");
                        } else {
                            // We need to use a different key for the editors with details, because the key "editors" is used for the ids and used to patch the section
                            section_data["metadata"]["editors_with_details"] = values;
                        }
                    }catch(e){
                        Tools.stop_loading_spinner();
                        console.log(e);
                        Tools.show_alert("Failed to load all editors", "danger");
                    }
                }

                // @ts-ignore
                document.getElementsByClassName("editor-details")[0].innerHTML = Handlebars.templates.editor_section_view(section_data);

                // Add event listeners
                document.getElementById("section_metadata_search_authors").addEventListener("input", search_authors);
                document.getElementById("section_metadata_search_authors").addEventListener("click", search_authors);
                document.getElementById("section_metadata_search_editors").addEventListener("input", search_editors);
                document.getElementById("section_metadata_search_editors").addEventListener("click", search_editors);
                add_author_remove_handlers();
                add_editor_remove_handlers();
            }catch (e) {
                console.error(e);
                Tools.show_alert("Couldn't load section. Check your network connection.", "danger");
            }
        }

        // @ts-ignore
        async function search_authors() {
            // @ts-ignore
            let author_search_select_handler = async function () {
                let person_id = this.getAttribute("data-id");
                let authors = section_data["metadata"]["authors"];

                //TODO: prevent duplicates
                if(authors.includes(person_id)){
                    Tools.show_alert("This author is already added to the section.", "warning");
                    return;
                }
                authors.push(person_id);

                let patch_data = {
                    "metadata": {
                        "authors": authors,
                    }
                }


                let send_patch_section_req =  send_patch_section(globalThis.section_path, patch_data);
                let person_data_req = Editor.ProjectOverview.send_get_person_request(person_id);

                try{
                // @ts-ignore
                    let res = await Promise.all([send_patch_section_req, person_data_req]);
                    console.log("Person data:");
                    console.log(res[1]);
                    // @ts-ignore
                    document.getElementById("section_metadata_authors_ul").innerHTML += Handlebars.templates.editor_section_authors_li(res[1]);

                }catch(e){
                    console.error(e);
                    Tools.show_alert("Failed to add author to section.", "danger");
                    // Remove the author from the list again
                    authors.splice(authors.indexOf(person_id), 1);

                    //TODO: check what caused the error, remove invalid authors from the list, if that caused the error (case: author was deleted but not removed from the section)
                }
                add_author_remove_handlers();
            }
            let search_term = (<HTMLInputElement>document.getElementById("section_metadata_search_authors")).value;
            let result_ul = document.getElementById("section_metadata_search_authors_results");

            if (search_term === "") {
                result_ul.innerHTML = "";
                return;
            }

            try {
                await Editor.ProjectOverview.search_person(search_term, result_ul, document.getElementById("section_metadata_search_authors"), author_search_select_handler);
            } catch (e) {
                console.error(e);
                Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
            }
        }

        // @ts-ignore
        async function search_editors() {
            // @ts-ignore
            let editor_search_select_handler = async function () {
                let person_id = this.getAttribute("data-id");
                let editors = section_data["metadata"]["editors"];

                //TODO: prevent duplicates
                if(editors.includes(person_id)){
                    Tools.show_alert("This editor is already added to the section.", "warning");
                    return;
                }
                editors.push(person_id);

                let patch_data = {
                    "metadata": {
                        "editors": editors,
                    }
                }


                let send_patch_section_req =  send_patch_section(globalThis.section_path, patch_data);
                let person_data_req = Editor.ProjectOverview.send_get_person_request(person_id);

                try{
                    // @ts-ignore
                    let res = await Promise.all([send_patch_section_req, person_data_req]);
                    console.log("Person data:");
                    console.log(res[1]);
                    // @ts-ignore
                    document.getElementById("section_metadata_editors_ul").innerHTML += Handlebars.templates.editor_section_editors_li(res[1]);

                }catch(e){
                    console.error(e);
                    Tools.show_alert("Failed to add editor to section.", "danger");
                    // Remove the editor from the list again
                    editors.splice(editors.indexOf(person_id), 1);

                    //TODO: check what caused the error, remove invalid editors from the list, if that caused the error (case: editor was deleted but not removed from the section)
                }
                add_editor_remove_handlers();
            }
            let search_term = (<HTMLInputElement>document.getElementById("section_metadata_search_editors")).value;
            let result_ul = document.getElementById("section_metadata_search_editors_results");

            if (search_term === "") {
                result_ul.innerHTML = "";
                return;
            }

            try {
                await Editor.ProjectOverview.search_person(search_term, result_ul, document.getElementById("section_metadata_search_editors"), editor_search_select_handler);
            } catch (e) {
                console.error(e);
                Tools.show_alert("Failed to search for editors. Check your network connection.", "danger");
            }
        }

        function add_author_remove_handlers(){
            // @ts-ignore
            let handler = async function () {
                let author_id = this.parentElement.getAttribute("data-id");
                let authors = section_data["metadata"]["authors"];
                authors.splice(authors.indexOf(author_id), 1);

                let patch_data = {
                    "metadata": {
                        "authors": authors,
                    }
                }

                Tools.start_loading_spinner();
                try {
                    await send_patch_section(globalThis.section_path, patch_data);
                    document.getElementById("section_metadata_authors_li_"+author_id).remove();
                } catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to remove author from section.", "danger");
                    // Add the author to the list again
                    authors.push(author_id);
                }
                Tools.stop_loading_spinner();
            }

            // @ts-ignore
            for(let button of document.getElementsByClassName("section_metadata_authors_remove")){
                button.addEventListener("click", handler);
            }
        }

        function add_editor_remove_handlers(){
            // @ts-ignore
            let handler = async function () {
                let editor_id = this.parentElement.getAttribute("data-id");
                let editors = section_data["metadata"]["editors"];
                editors.splice(editors.indexOf(editor_id), 1);

                let patch_data = {
                    "metadata": {
                        "editors": editors,
                    }
                }

                Tools.start_loading_spinner();
                try {
                    await send_patch_section(globalThis.section_path, patch_data);
                    document.getElementById("section_metadata_editors_li_"+editor_id).remove();
                } catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to remove editor from section.", "danger");
                    // Add the editor to the list again
                    editors.push(editor_id);
                }
                Tools.stop_loading_spinner();
            }

            // @ts-ignore
            for(let button of document.getElementsByClassName("section_metadata_editors_remove")){
                button.addEventListener("click", handler);
            }
        }

        async function send_get_section(section_path: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to get section data: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to get section data: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        async function send_patch_section(section_path: string, section_data: object){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(section_data)
            });
            if(!response.ok){
                throw new Error(`Failed to patch section data: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to patch section data: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }
    }
}