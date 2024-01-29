/// <reference path="Editor.ts" />
namespace Editor{
    export namespace ProjectOverview{
        export function show_overview() {
            console.log("Loading overview for project "+globalThis.project_id);

            let project_data = load_project_metadata(globalThis.project_id);
            let project_settings = load_project_settings(globalThis.project_id);

            Tools.start_loading_spinner();
            // @ts-ignore
            Promise.all([project_data, project_settings]).then(async function(values){
                // @ts-ignore
                Tools.stop_loading_spinner();

                let data = {};
                // @ts-ignore
                data["metadata"] = values[0].data || null;
                // @ts-ignore
                data["settings"] = values[1].data || null;

                // Retrieve details for authors and editors
                if (data["metadata"] != null && data["metadata"]["authors"] != null) {
                    let promises = [];

                    for (let author of data["metadata"]["authors"]) {
                        promises.push(send_get_person_request(author));
                    }

                    Tools.start_loading_spinner();

                    try {
                        // @ts-ignore
                        let values = await Promise.all(promises);
                        Tools.stop_loading_spinner();

                        console.log(values);
                        if (values.length !== data["metadata"]["authors"].length) {
                            console.log("Failed to load all authors");
                            Tools.show_alert("Failed to load all authors", "danger");
                        } else {
                            data["metadata"]["authors"] = values;
                        }
                    }catch(e){
                        Tools.stop_loading_spinner();
                        console.log(e);
                        Tools.show_alert("Failed to load all authors", "danger");
                    }
                }
                if (data["metadata"] != null && data["metadata"]["editors"] != null) {
                    let promises = [];

                    for (let editor of data["metadata"]["editors"]) {
                        promises.push(send_get_person_request(editor));
                    }

                    Tools.start_loading_spinner();

                    try {
                        // @ts-ignore
                        let values = await Promise.all(promises);
                        Tools.stop_loading_spinner();

                        console.log(values);
                        if (values.length !== data["metadata"]["editors"].length) {
                            console.log("Failed to load all editors");
                            Tools.show_alert("Failed to load all editors", "danger");
                        } else {
                            data["metadata"]["editors"] = values;
                        }
                    }catch(e){
                        Tools.stop_loading_spinner();
                        console.log(e);
                        Tools.show_alert("Failed to load all editors", "danger");
                    }
                }

                if(data["metadata"] != null && data["metadata"]["languages"] != null){
                    // Set each entry to true if it is in the languages array
                    let languages = {};
                    for(let language of data["metadata"]["languages"]){
                        languages[language] = true;
                    }
                    data["metadata"]["languages"] = languages;
                }

                if(data["metadata"] != null && data["metadata"]["license"] != null){
                    let license = data["metadata"]["license"];
                    data["metadata"]["license"] = {};
                    data["metadata"]["license"][license] = true;
                }

                console.log(data);
                // @ts-ignore
                let details = Handlebars.templates.editor_main_project_overview(data);
                document.getElementsByClassName("editor-details")[0].innerHTML = details;

                // Show selected DDC
                if(data["metadata"] != null && data["metadata"]["ddc"] != null){
                    let ddc = data["metadata"]["ddc"];
                    console.log("DDC is:"+ddc);
                    //Split ddc into three digits
                    let ddc_first_level = ddc.substring(0,1);
                    let ddc_second_level = ddc.substring(0,2);
                    let ddc_third_level = ddc.substring(0,3);

                    let first_level = document.getElementById("project_metadata_ddc_main_classes") as HTMLSelectElement;
                    first_level.value = ddc_first_level;
                    let second_level = document.getElementById("project_metadata_ddc_"+ddc_first_level) as HTMLSelectElement;
                    second_level.value = ddc_second_level;
                    second_level.classList.remove("hide");
                    let third_level = document.getElementById("project_metadata_ddc_"+ddc_second_level) as HTMLSelectElement;

                    if(third_level){
                        third_level.value = ddc_third_level;
                        third_level.classList.remove("hide");
                    }else{
                        second_level.value = ddc_third_level;
                    }
                }
                attach_ddc_handlers();

                document.getElementById("project_settings_toc_enabled").addEventListener("change", update_settings);

                document.getElementById("project_metadata_search_authors").addEventListener("input", search_authors);
                document.getElementById("project_metadata_search_authors").addEventListener("click", search_authors);
                document.getElementById("project_metadata_search_editors").addEventListener("input", search_editors);
                document.getElementById("project_metadata_search_editors").addEventListener("click", search_editors);

                add_remove_author_editor_handlers();

                // Add listeners to all remove keyword buttons
                // @ts-ignore
                for(let button of document.getElementsByClassName("project_metadata_keywords_remove")){
                    button.addEventListener("click", remove_keyword_btn_handler);
                }

                //Add listener to add keyword button
                document.getElementById("project_metadata_keyword_add_without_gnd_btn").addEventListener("click", add_keyword_without_gnd_handler);

                // Add listeners to all input fields to update on change
                // @ts-ignore
                for(let input of document.getElementsByClassName("project_metadata_field")){
                    input.addEventListener("change", update_metadata);
                }

                //Add listener to keyword search
                document.getElementById("project_metadata_keyword_search").addEventListener("input", search_gnd_keyword);
                document.getElementById("project_metadata_keyword_search").addEventListener("click", search_gnd_keyword);

                // Add listener to add identifier button
                document.getElementById("project_metadata_identifiers_add").addEventListener("click", add_identifier_btn_handler);

                // Add listeners to all remove identifier buttons
                // @ts-ignore
                for(let button of document.getElementsByClassName("project_metadata_identifier_remove_btn")){
                    button.addEventListener("click", remove_identifier_btn_handler);
                }
            }, function(error){
                // @ts-ignore
                Tools.stop_loading_spinner();
                alert("Failed to load project");
                console.log(error);
            });
        }

        // @ts-ignore
        async function remove_identifier_btn_handler(e){
            let target = e.target as HTMLElement;
            let li = target.closest(".project_metadata_identifier_row");
            let identifier_id = li.getAttribute("data-identifier-id");

            Tools.start_loading_spinner();
            try{
                await send_remove_identifier_request(identifier_id);
                Tools.stop_loading_spinner();
                li.remove();
                Tools.show_alert("Identifier removed.", "success");
            }catch(e){
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to remove identifier.", "danger");
                console.error(e);
            }
        }

        // @ts-ignore
        async function add_identifier_btn_handler(){
            let identifier = {};
            identifier["identifier_type"] = (<HTMLInputElement>document.getElementById("project_metadata_identifiers_type")).value || null;
            identifier["value"] = (<HTMLInputElement>document.getElementById("project_metadata_identifiers_value")).value || null;
            identifier["name"] = (<HTMLInputElement>document.getElementById("project_metadata_identifiers_name")).value || null;

            if(!identifier["identifier_type"] || !identifier["value"] || !identifier["name"]){
                Tools.show_alert("Couldn't add Identifier: Please fill out all fields.", "danger");
                return;
            }

            try{
                Tools.start_loading_spinner();
                let response = await send_add_identifier_request(identifier);
                Tools.stop_loading_spinner();

                Tools.show_alert("Identifier added.", "success");

                // @ts-ignore
                document.getElementById("project_metadata_identifiers_list").innerHTML += Handlebars.templates.editor_add_identifier_row(response.data);

                //Add remove handler:
                // @ts-ignore
                for(let button of document.getElementsByClassName("project_metadata_identifier_remove_btn")){
                    button.addEventListener("click", remove_identifier_btn_handler);
                }

                // Clear input fields
                (<HTMLInputElement>document.getElementById("project_metadata_identifiers_value")).value = "";
                (<HTMLInputElement>document.getElementById("project_metadata_identifiers_name")).value = "";
            }catch (e) {
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to add identifier.", "danger");
                console.error(e);
            }

        }

        async function send_remove_identifier_request(identifier_id: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/identifiers/${identifier_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to send remove identifier request`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to remove identifier: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        async function send_add_identifier_request(identifier: Object){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/identifiers/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(identifier)
            });
            if(!response.ok){
                throw new Error(`Failed to send add identifier request`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to remove keyword: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        // @ts-ignore
        async function add_keyword_without_gnd_handler() {
            let keyword = {};
            let searchbar = document.getElementById("project_metadata_keyword_search") as HTMLInputElement;
            keyword["title"] = searchbar.value;
            keyword["gnd"] = null;
            try {
                Tools.start_loading_spinner();
                await send_add_keyword_request(keyword);
                Tools.stop_loading_spinner();

                Tools.show_alert("Keyword added.", "success");

                searchbar.value = "";

                // @ts-ignore
                document.getElementById("project_metadata_keywords").innerHTML += Handlebars.templates.editor_keyword_li(keyword);

                //Add remove handler:
                // @ts-ignore
                for (let button of document.getElementsByClassName("project_metadata_keywords_remove")) {
                    button.addEventListener("click", remove_keyword_btn_handler);
                }
            }catch(e){
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to add keyword.", "danger");
                console.error(e);
            }
        }

        // @ts-ignore
        async function search_gnd_keyword(){
            let search_term = (<HTMLInputElement>document.getElementById("project_metadata_keyword_search")).value;
            if(search_term === ""){
                return;
            }

            console.log("Searching for keyword "+search_term);
            try{
                Tools.start_loading_spinner();
                let response = await send_gnd_api_search_request(search_term);
                Tools.stop_loading_spinner();
                let result_ul = document.getElementById("project_metadata_keyword_search_result");
                result_ul.innerHTML = "";
                result_ul.classList.remove("hide");

                let hide_results = function(e){
                    let target = e.target as HTMLElement;

                    if(target !== result_ul && target !== document.getElementById("project_metadata_keyword_search")){
                        if(target != null){
                            if(target.parentElement === result_ul){
                                return;
                            }
                        }
                        result_ul.classList.add("hide");
                        window.removeEventListener("click", hide_results);
                        window.removeEventListener("focusin", hide_results);
                    }
                }

                window.addEventListener("click", hide_results);
                window.addEventListener("focusin", hide_results);

                for(let entry of response.data){
                    // Get the id without the prefix
                    entry.id = entry.id.replace("https://d-nb.info/gnd/", "");
                    // @ts-ignore
                    result_ul.innerHTML += Handlebars.templates.editor_keyword_gnd_search(entry);
                }

                // Add listeners to all li entries
                // @ts-ignore
                for(let entry of result_ul.getElementsByTagName("li")){
                    // @ts-ignore
                    entry.addEventListener("click", async function(){
                        let keyword = {};
                        keyword["title"] = this.getAttribute("data-title");
                        keyword["gnd"] = {
                            "name": "GND",
                            "value": this.getAttribute("data-gnd"),
                            "identifier_type": "GND"
                        };
                        try{
                            Tools.start_loading_spinner();
                            await send_add_keyword_request(keyword);
                            Tools.stop_loading_spinner();

                            Tools.show_alert("Keyword added.", "success");
                            let searchbar = document.getElementById("project_metadata_keyword_search") as HTMLInputElement;
                            searchbar.value = "";
                            result_ul.classList.add("hide");
                            window.removeEventListener("click", hide_results);
                            window.removeEventListener("focusin", hide_results);

                            // @ts-ignore
                            document.getElementById("project_metadata_keywords").innerHTML += Handlebars.templates.editor_keyword_li(keyword);

                            //Add remove handler:
                            // @ts-ignore
                            for(let button of document.getElementsByClassName("project_metadata_keywords_remove")){
                                button.addEventListener("click", remove_keyword_btn_handler);
                            }
                        }catch(e){
                            Tools.stop_loading_spinner();
                            Tools.show_alert("Failed to add keyword.", "danger");
                            console.error(e);
                        }
                    });
                }
            }catch(e) {
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to search for keyword. Check your network connection", "danger");
                console.error(e);
            }
        }

        // @ts-ignore
        async function remove_keyword_btn_handler(e){
            let target = e.target as HTMLElement;
            let div = target.closest(".project_metadata_keywords_entry_wrapper");
            let keyword = div.getAttribute("data-keyword");

            Tools.start_loading_spinner();
            try{
                await send_remove_keyword_request(keyword);
                Tools.stop_loading_spinner();
                div.remove();
                Tools.show_alert("Keyword removed.", "success");
            }catch(e){
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to remove keyword.", "danger");
                console.error(e);
            }
        }

        async function send_remove_keyword_request(keyword: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/keywords/${keyword}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to send remove keyword request`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to remove keyword: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        // @ts-ignore
        async function send_add_keyword_request(keyword){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/keywords`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(keyword)
            });
            if(!response.ok){
                throw new Error(`Failed to send add keyword request`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to add keyword: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        // @ts-ignore
        async function send_gnd_api_search_request(search_term: string){
            const response = await fetch(`/api/gnd?q=${search_term}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok){
                throw new Error(`Failed to send search request for persons`);
            }else{
                return await response.json();
            }
        }

        function add_remove_author_editor_handlers(){
            // Add listeners to all author remove buttons
            // @ts-ignore
            for(let button of document.getElementsByClassName("project_metadata_authors_remove")){
                button.addEventListener("click", remove_author_btn_handler);
            }

            // Add listeners to all editor remove buttons
            // @ts-ignore
            for(let button of document.getElementsByClassName("project_metadata_editors_remove")){
                button.addEventListener("click", remove_editor_btn_handler);
            }
        }

        // @ts-ignore
        async function remove_author_btn_handler(e){
            let target = e.target as HTMLElement;
            let li = target.closest("li");
            let person_id = li.getAttribute("data-id");

            Tools.start_loading_spinner();
            try{
                await send_remove_author_request(person_id);
                Tools.stop_loading_spinner();
                li.remove();
            }catch(e){
                Tools.show_alert("Failed to remove author.", "danger");
            }
        }

        // @ts-ignore
        async function send_remove_author_request(person_id: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/authors/${person_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(response.ok){
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")){
                    throw new Error(`Failed to remove author: ${response_data["error"]}`);
                }else{
                    return response_data["data"];
                }
            }else{
                throw new Error(`Failed to get person.`);
            }
        }

        // @ts-ignore
        async function remove_editor_btn_handler(e){
            let target = e.target as HTMLElement;
            let li = target.closest("li");
            let person_id = li.getAttribute("data-id");

            Tools.start_loading_spinner();
            try{
                await send_remove_editor_request(person_id);
                Tools.stop_loading_spinner();
                li.remove();
            }catch(e){
                Tools.show_alert("Failed to remove editor.", "danger");
            }
        }

        // @ts-ignore
        async function send_remove_editor_request(person_id: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/editors/${person_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(response.ok){
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")){
                    throw new Error(`Failed to remove editor: ${response_data["error"]}`);
                }else{
                    return response_data["data"];
                }
            }else{
                throw new Error(`Failed to remove editor.`);
            }
        }

        function search_authors(){
            let search_term = (<HTMLInputElement>document.getElementById("project_metadata_search_authors")).value;
            let result_ul = document.getElementById("project_metadata_search_authors_results");

            if(search_term === ""){
                result_ul.innerHTML = "";
                return;
            }

            send_search_person_request(search_term).then(function(data){
                console.log(data.data);
                result_ul.innerHTML = "";
                result_ul.classList.remove("hide");

                let hide_results = function(e){
                    let target = e.target as HTMLElement;

                    if(target !== result_ul && target !== document.getElementById("project_metadata_search_authors")){
                        if(target != null){
                            if(target.parentElement === result_ul){
                                return;
                            }
                        }
                        result_ul.classList.add("hide");
                        window.removeEventListener("click", hide_results);
                        window.removeEventListener("focusin", hide_results);
                    }
                }

                window.addEventListener("click", hide_results);
                window.addEventListener("focusin", hide_results);

                for(let person of data.data){
                    // @ts-ignore
                    result_ul.innerHTML += Handlebars.templates.editor_add_person_li(person);
                }

                // @ts-ignore
                let add_person_handler = async function () {
                    let person_id = this.getAttribute("data-id");
                    try {
                        await send_add_author_to_project_request(person_id);

                        let person_data = await send_get_person_request(person_id);
                        // @ts-ignore
                        document.getElementById("project_metadata_authors_ul").innerHTML += Handlebars.templates.editor_add_authors_li(person_data);
                        add_remove_author_editor_handlers();
                    } catch (e) {
                        Tools.show_alert("Failed to add author.", "danger");
                    }
                }

                // @ts-ignore
                for(let li of result_ul.getElementsByTagName("li")){
                    li.addEventListener("click", add_person_handler);
                }

            }).catch(function(){
                Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
            });
        }

        function search_editors(){
            let search_term = (<HTMLInputElement>document.getElementById("project_metadata_search_editors")).value;
            let result_ul = document.getElementById("project_metadata_search_editors_results");

            if(search_term === ""){
                result_ul.innerHTML = "";
                return;
            }

            send_search_person_request(search_term).then(function(data){
                console.log(data.data);
                result_ul.innerHTML = "";
                result_ul.classList.remove("hide");

                let hide_results = function(e){
                    let target = e.target as HTMLElement;

                    if(target !== result_ul && target !== document.getElementById("project_metadata_search_editors")){
                        if(target != null){
                            if(target.parentElement === result_ul){
                                return;
                            }
                        }
                        result_ul.classList.add("hide");
                        window.removeEventListener("click", hide_results);
                        window.removeEventListener("focusin", hide_results);
                    }
                }

                window.addEventListener("click", hide_results);
                window.addEventListener("focusin", hide_results);

                for(let person of data.data){
                    // @ts-ignore
                    result_ul.innerHTML += Handlebars.templates.editor_add_person_li(person);
                }

                // @ts-ignore
                let add_person_handler = async function () {
                    let person_id = this.getAttribute("data-id");
                    try {
                        await send_add_editor_to_project_request(person_id);

                        let person_data = await send_get_person_request(person_id);
                        // @ts-ignore
                        document.getElementById("project_metadata_editors_ul").innerHTML += Handlebars.templates.editor_add_editors_li(person_data);
                        add_remove_author_editor_handlers();
                    } catch (e) {
                        Tools.show_alert("Failed to add editor.", "danger");
                    }
                }

                // @ts-ignore
                for(let li of result_ul.getElementsByTagName("li")){
                    li.addEventListener("click", add_person_handler);
                }

            }).catch(function(){
                Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
            });
        }

        async function send_search_person_request(search_term: string){
            const response = await fetch(`/api/persons?query=${search_term}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok){
                throw new Error(`Failed to send search request for persons`);
            }else{
                return await response.json();
            }
        }

        async function send_get_person_request(person_id: string){
            const response = await fetch(`/api/persons/${person_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(response.ok){
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")){
                    throw new Error(`Failed to get person: ${response_data["error"]}`);
                }else{
                    return response_data["data"];
                }
            }else{
                throw new Error(`Failed to get person.`);
            }
        }

        async function send_add_author_to_project_request(person_id: string){
                const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/authors/${person_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if(response.ok){
                    let response_data = await response.json();
                    if(response_data.hasOwnProperty("error")){
                        throw new Error(`Failed to add person: ${response_data["error"]}`);
                    }else{
                        return response_data;
                    }
                }else{
                    throw new Error(`Failed to add person to project.`);
                }
        }

        async function send_add_editor_to_project_request(person_id: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/metadata/editors/${person_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(response.ok){
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")){
                    throw new Error(`Failed to add person: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }else{
                throw new Error(`Failed to add person to project.`);
            }
        }

        function attach_ddc_handlers(){
            // @ts-ignore
            let handle_change = async function(this: HTMLSelectElement){
                let value = this.options[this.selectedIndex].value;

                // Hide all sub selects
                if(this.classList.contains("ddc_first_level")){
                    Tools.hide_all("ddc_second_level");
                    Tools.hide_all("ddc_third_level");
                }else if(this.classList.contains("ddc_second_level")){
                    Tools.hide_all("ddc_third_level");
                }

                // Show the sub select
                let sub_select = document.getElementById("project_metadata_ddc_"+value) as HTMLSelectElement;
                if(sub_select){
                    sub_select.classList.remove("hide");

                    // Show the sub sub select
                    let value2 = sub_select.options[sub_select.selectedIndex].value;
                    let sub_sub_select = document.getElementById("project_metadata_ddc_"+value2);
                    if(sub_sub_select){
                        sub_sub_select.classList.remove("hide");
                    }
                }

                await update_metadata();
            };

            let selects = document.getElementsByClassName("ddc_select");
            // @ts-ignore
            for(let select of selects){
                select.addEventListener("change", handle_change);
            }
        }

        async function update_settings(){
            console.log("Updating settings for project "+globalThis.project_id);

            let data = {};
            data["toc_enabled"] = (<HTMLInputElement>document.getElementById("project_settings_toc_enabled")).checked;

            try {
                Tools.start_loading_spinner();
                const response = await fetch(`/api/projects/${globalThis.project_id}/settings`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                Tools.stop_loading_spinner();
                if (!response.ok) {
                    throw new Error(`Failed to update project settings ${globalThis.project_id}`);
                } else {
                    Tools.show_alert("Settings updated.", "success");
                    return response.json();
                }
            }catch(e){
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to update settings.", "danger");
            }
        }

        async function update_metadata(){
            console.log("Updating metadata for project "+globalThis.project_id);

            let data = {};
            data["title"] = (<HTMLInputElement>document.getElementById("project_metadata_title")).value || null;
            data["subtitle"] = (<HTMLInputElement>document.getElementById("project_metadata_subtitle")).value || null;
            data["web_url"] = (<HTMLInputElement>document.getElementById("project_metadata_web_url")).value || null;
            data["published"] = null;
            data["languages"] = null;

            // Check which languages are checked
            let languages = [];
            // @ts-ignore
            for(let checkbox of document.getElementsByClassName("project_metadata_language_checkbox") as HTMLCollectionOf<HTMLInputElement>){
                if(checkbox.checked){
                    languages.push(checkbox.value);
                }
            }
            if(languages.length > 0){
                data["languages"] = languages;
            }

            data["short_abstract"] = (<HTMLInputElement>document.getElementById("project_metadata_short_abstract")).value || null;
            data["long_abstract"] = (<HTMLInputElement>document.getElementById("project_metadata_long_abstract")).value || null;
            data["license"] = null;
            if((<HTMLInputElement>document.getElementById("project_metadata_license")).value !== "none"){
                data["license"] = (<HTMLInputElement>document.getElementById("project_metadata_license")).value;
            }

            data["series"] = (<HTMLInputElement>document.getElementById("project_metadata_series")).value || null;
            data["volume"] = (<HTMLInputElement>document.getElementById("project_metadata_volume")).value || null;
            data["edition"] = (<HTMLInputElement>document.getElementById("project_metadata_edition")).value || null;
            data["publisher"] = (<HTMLInputElement>document.getElementById("project_metadata_publisher")).value || null;
            data["ddc"] = null;

            // Get DDC class:
            let main_class = (<HTMLInputElement>document.getElementById("project_metadata_ddc_main_classes")).value;
            if(main_class !== "none"){
                let second_class = (<HTMLInputElement>document.getElementById("project_metadata_ddc_"+main_class)).value;
                let third_class = (<HTMLInputElement>document.getElementById("project_metadata_ddc_"+second_class));

                if (third_class){
                    data["ddc"] = third_class.value;
                }else{
                    data["ddc"] = second_class;
                }
            }

            console.log("new data: "+JSON.stringify(data));

            try {
                Tools.start_loading_spinner();
                const response = await fetch(`/api/projects/${globalThis.project_id}/metadata`, {
                    method: 'PATCH',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                Tools.stop_loading_spinner();
                if (!response.ok) {
                    throw new Error(`Failed to update project metadata ${globalThis.project_id}`);
                } else {
                    Tools.show_alert("Metadata updated.", "success");
                    return response.json();
                }
            }catch(e){
                Tools.stop_loading_spinner();
                Tools.show_alert("Failed to update metadata.", "danger");
            }
        }

        // @ts-ignore
        export async function load_project_metadata(project_id: string): Promise<Object> {
            const response = await fetch(`/api/projects/${project_id}/metadata`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok){
                throw new Error(`Failed to load project metadata ${project_id}`);
            }else{
                return response.json();
            }
        }

        // @ts-ignore
        async function load_project_settings(project_id: string): Promise<Object>{
            const response = await fetch(`/api/projects/${project_id}/settings`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok){
                throw new Error(`Failed to load project settings ${project_id}`);
            }else{
                return response.json();
            }
        }
    }
}
