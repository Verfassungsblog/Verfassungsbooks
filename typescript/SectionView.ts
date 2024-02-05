/// <reference path="Editor.ts" />
namespace Editor{
    export namespace SectionView{

        declare var section_data: object | null;
        declare var typing_timer: number | null;
        declare var pending_content_block_changes: Array<HTMLElement>;

        // @ts-ignore
        export async function show_section_view(){
            typing_timer = null;
            pending_content_block_changes = [];

            try {
                section_data = await send_get_section(globalThis.section_path);

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

                if (section_data["metadata"]["lang"] !== null) {
                    section_data["metadata"]["langval"] = {};
                    // Add the language to the langval object, so that the language is selected in the dropdown
                    section_data["metadata"]["langval"][section_data["metadata"]["lang"]] = true;
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
                add_identifier_remove_handlers();
                add_quickchange_handlers();
                document.getElementById("section_metadata_identifiers_add").addEventListener("click", add_identifier);
                document.getElementById("section_delete_first_stage").addEventListener("click", function(){
                    document.getElementById("section_delete_warning").classList.remove("hide");
                });
                document.getElementById("section_delete_cancel").addEventListener("click", function(){
                    document.getElementById("section_delete_warning").classList.add("hide");
                });
                document.getElementById("section_delete_confirm").addEventListener("click", delete_section_handler);
                document.getElementById("section_show_metadata").addEventListener("click", expand_metadata);
                document.getElementById("section_hide_metadata").addEventListener("click", collapse_metadata);

                // @ts-ignore
                for(let button of document.getElementsByClassName("new_block_selection")){
                    button.addEventListener("click", new_block_selection_handler);
                }

                // Load content blocks
                let content_blocks = await send_get_content_blocks(globalThis.section_path);
                console.log(content_blocks);
                for(let block of content_blocks){
                    // @ts-ignore
                    let html = Handlebars.templates.editor_content_block(ContentBlockParser.contentblock_from_api(block));
                    document.getElementById("section_content_blocks_inner").innerHTML += html;
                    clean_content_block_input(document.getElementById("section_content_blocks_inner").lastChild);
                }
                add_content_block_handlers();
            }catch (e) {
                console.error(e);
                Tools.show_alert("Couldn't load section. Check your network connection.", "danger");
            }
        }

        function add_content_block_handlers(){
            // Register input change event listeners for all input fields in any content block
            // @ts-ignore
            for(let field of document.getElementsByClassName("content_block_input_trigger")){
                field.addEventListener("input", content_block_input_handler);
            }

            // Register move up event listeners for all content blocks
            // @ts-ignore
            for(let button of document.getElementsByClassName("content_block_ctls_up")){
                button.addEventListener("click", content_block_move_up_handler);
            }

            // Register move down event listeners for all content blocks
            // @ts-ignore
            for(let button of document.getElementsByClassName("content_block_ctls_down")){
                button.addEventListener("click", content_block_move_down_handler);
            }

            // @ts-ignore
            for(let button of document.getElementsByClassName("textelement_edit_bar_btn")){
                button.addEventListener("click", content_block_edit_bar_handler);
            }

            // @ts-ignore
            for(let button of document.getElementsByClassName("content_block")){
                button.addEventListener("click", Sidebar.show_content_block_settings_sidebar);
            }
        }

        function content_block_edit_bar_handler(e){
            let action = e.target.getAttribute("data-action");

            let selection = window.getSelection();
            let range = selection.getRangeAt(0); // TODO: handle multiple ranges

            function checkIfFormatted(node, type) {
                while (node != null && node.nodeName !== "BODY") {
                    if (node.nodeName === "SPAN" && node.classList.contains("formatted_text_"+type)) {
                        return node; // Gibt den gefundenen <span> zurück
                    }
                    node = node.parentNode;
                }
                return null;
            }

            let formattedNode = checkIfFormatted(range.startContainer, "bold");
            if (formattedNode) {
                // Wenn bereits formatiert, <span> entfernen
                let parent = formattedNode.parentNode;
                while (formattedNode.firstChild) {
                    parent.insertBefore(formattedNode.firstChild, formattedNode);
                }
                parent.removeChild(formattedNode);
                return;
            }

            let new_element = document.createElement("span");
            new_element.classList.add("formatted_text");
            new_element.classList.add("formatted_text_bold");
            range.surroundContents(new_element);
            selection.removeAllRanges();
        }

        // @ts-ignore
        async function content_block_move_down_handler(e){
            let block = e.target.closest(".content_block");
            let next = block.nextElementSibling || null;

            if(next === null){ // Do nothing if block is already at the bottom
                return;
            }

            let block_id = block.getAttribute("data-block-id");
            let after = null;
            if(next === null){
                after= null;
            }else{
                after = next.getAttribute("data-block-id");
            }

            try {
                await send_move_content_block(globalThis.section_path, block_id, after);
                next.after(block);
            }catch (e) {
                console.error(e);
                Tools.show_alert("Failed to move content block.", "danger");
            }
        }

        // @ts-ignore
        async function content_block_move_up_handler(e){
            let block = e.target.closest(".content_block");
            let prev_sib = block.previousElementSibling || null;
            if(prev_sib !== null){
                prev_sib = prev_sib.previousElementSibling || null; // We need the previous sibling of the previous sibling to get the block to insert after
            }
            let block_id = block.getAttribute("data-block-id");
            let prev = null;
            if(prev_sib === null){
                prev = null;
            }else{
                console.log(prev_sib);
                prev = prev_sib.getAttribute("data-block-id");
            }

            try {
                await send_move_content_block(globalThis.section_path, block_id, prev);
                if(prev_sib !== null) {
                    prev_sib.after(block);
                }else{ // If there is no previous sibling, we need to move the block to the top
                    block.parentElement.insertBefore(block, block.parentElement.firstChild);
                }
            }catch (e) {
                console.error(e);
                Tools.show_alert("Failed to move content block.", "danger");
            }
        }

        // @ts-ignore
        async function content_block_input_handler(input){
            // Only store the content block in the to upload list if it's not already there
            // @ts-ignore
            if(pending_content_block_changes.includes(input.target)){
                return;
            }
            pending_content_block_changes.push(input.target);
            if (typing_timer) {
                clearTimeout(typing_timer);
            }

            // Set a timeout to wait for the user to stop typing
            // @ts-ignore
            typing_timer = setTimeout(async function(){
                await upload_pending_content_block_changes();
            }, 1000);
        }

        /// Upload all pending content block changes
        // @ts-ignore
        async function upload_pending_content_block_changes(){
            let requests = [];
            for(let change of pending_content_block_changes){
                requests.push(content_block_change_handler(change));
            }
            pending_content_block_changes = [];
            // @ts-ignore
            await Promise.all(requests)
        }

        function clean_content_block_input(block){
            let input = block.getElementsByClassName("content_block_input_trigger")[0];
            input.innerHTML = input.innerHTML.replace("\n", "");
        }

        // @ts-ignore
        async function content_block_change_handler(e){
            let block = e.closest(".content_block");
            let json = ContentBlockParser.parse_contentblock_from_html(block);
            console.log(json);

            try{
                let res = await send_update_content_block(globalThis.section_path, json);
                console.log(res);
                Tools.show_alert("Successfully updated content block.", "success");
            }catch(e){
                console.error(e);
                Tools.show_alert("Failed to update content block.", "danger");
            }
        }

        async function send_move_content_block(section_path: string, block_id: string, after: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path+"/content_blocks/move", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "insert_after": after,
                    "content_block_id": block_id,
                })
            });
            if(!response.ok){
                throw new Error(`Failed to move content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to move content block: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        async function send_get_content_blocks(section_path: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path+"/content_blocks", {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to get content blocks: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to get content blocks: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        async function send_add_new_content_block(section_path: string, block_data: Editor.ContentBlockParser.ContentBlock){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path+"/content_blocks", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(block_data)
            });
            if(!response.ok){
                throw new Error(`Failed to create content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to create content block: ${response_data["error"]}`);
                }else{
                    return response_data.data;
                }
            }
        }

        async function send_update_content_block(section_path: string, block_data: Editor.ContentBlockParser.ContentBlock){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path+"/content_blocks/"+block_data.id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(block_data)
            });
            if(!response.ok){
                throw new Error(`Failed to update content block: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to post content block: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        // @ts-ignore
        async function new_block_selection_handler(){
            let block_type = this.getAttribute("data-type") || null;
            if(block_type === null){
                console.error("No block type specified");
                return;
            }
            if (block_type === "paragraph") {
                let paragraph: Editor.ContentBlockParser.ContentBlock = {
                    content: {
                        Paragraph: {
                            contents: [
                            ]
                        }
                    },
                    css_class: null,
                    id: null,
                    revision_id: null
                }
                try {
                    let res = await send_add_new_content_block(globalThis.section_path, paragraph);
                    console.log(res);
                    // @ts-ignore
                    let html = Handlebars.templates.editor_content_block(ContentBlockParser.contentblock_from_api(res));
                    document.getElementById("section_content_blocks_inner").innerHTML += html;
                    add_content_block_handlers();

                } catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to add new paragraph.", "danger");
                }
            }else{
                Tools.show_alert("Block type not implemented.", "warning");
            }
        }

        let collapse_metadata = function(){
            document.getElementsByClassName("editor_section_view_metadata")[0].classList.add("hide");
            document.getElementsByClassName("editor_section_view_collapsed_metadata")[0].classList.remove("hide");
        }

        let expand_metadata = function(){
            document.getElementsByClassName("editor_section_view_collapsed_metadata")[0].classList.add("hide");
            document.getElementsByClassName("editor_section_view_metadata")[0].classList.remove("hide");
        }

        // @ts-ignore
        let delete_section_handler = async function() {
            // Hide the warning
            document.getElementById("section_delete_warning").classList.add("hide");

            if(globalThis.section_path.split(":").slice(-1)[0] !== section_data["id"]){
                console.error("Section path and section data id don't match. This could lead to deleting the wrong section.");
                console.log("last section id in path is "+globalThis.section_path.split(":").slice(-1)[0]+ " and id is "+section_data["id"]);
                Tools.show_alert("Failed to delete section.", "danger");
                return;
            }

            Tools.start_loading_spinner();

            try{
                await send_delete_section(globalThis.section_path);
                Sidebar.build_sidebar();
                ProjectOverview.show_overview();
            }catch (e) {
                console.error(e);
                Tools.show_alert("Failed to delete section.", "danger");
            }
            Tools.stop_loading_spinner();
        };

        let send_delete_section = async function(section_path: string){
            const response = await fetch(`/api/projects/${globalThis.project_id}/sections/`+section_path, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if(!response.ok){
                throw new Error(`Failed to delete section: ${response.status}`);
            }else{
                let response_data = await response.json();
                if(response_data.hasOwnProperty("error")) {
                    throw new Error(`Failed to delete section: ${response_data["error"]}`);
                }else{
                    return response_data;
                }
            }
        }

        let add_quickchange_handlers = function(){
            // @ts-ignore
            for(let input of document.getElementsByClassName("quickchange")){
                input.addEventListener("input", quickchange_handler);
            }
        }

        // @ts-ignore
        let quickchange_handler = async function(){
            if (typing_timer) {
                clearTimeout(typing_timer);
            }

            // Set a timeout to wait for the user to stop typing
            // @ts-ignore
            typing_timer = setTimeout(async function(){
                await metadata_change_handler();
            }, 1000);
        }

        /// Handle metadata changes, except for authors and editors
        // @ts-ignore
        let metadata_change_handler = async function(){
            console.log("Metadata change handler");


            // Scrape identifiers from the DOM, since it may have changed

            let identifiers = [];
            // @ts-ignore
            for(let identifier_row of document.getElementsByClassName("section_metadata_identifier_row")){
                let identifier_id = identifier_row.getAttribute("data-identifier-id");
                let identifier_type = identifier_row.getAttribute("data-identifier-type");
                let identifier_name = (<HTMLInputElement>identifier_row.getElementsByClassName("section_metadata_identifier_name")[0]).value;
                let identifier_value = (<HTMLInputElement>identifier_row.getElementsByClassName("section_metadata_identifier_value")[0]).value;
                identifiers.push({
                    "id": identifier_id,
                    "identifier_type": identifier_type,
                    "name": identifier_name,
                    "value": identifier_value
                });
            }

            let lang = (<HTMLInputElement>document.getElementById("section_metadata_lang")).value;
            if (lang === "none") {
                lang = null;
            }

            let patch_data = {
                "metadata": {
                    "title": (<HTMLElement>document.getElementById("section_metadata_title")).innerText || null,
                    "subtitle": (<HTMLElement>document.getElementById("section_metadata_subtitle")).innerText || null,
                    "identifiers": identifiers,
                    "web_url": (<HTMLInputElement>document.getElementById("section_metadata_web_url")).value || null,
                    "lang": lang,
                }
            }

            console.log(patch_data);

            Tools.start_loading_spinner();
            try {
                section_data = await send_patch_section(globalThis.section_path, patch_data);
                Tools.show_alert("Successfully updated section metadata.", "success");
            } catch (e) {
                console.error(e);
                Tools.show_alert("Failed to patch section metadata.", "danger");
            }
            Tools.stop_loading_spinner();
        }

        let add_identifier_remove_handlers = function(){
            // @ts-ignore
            for(let button of document.getElementsByClassName("section_metadata_identifier_remove_btn")){
                button.addEventListener("click", remove_identifier_handler);
            }
        }

        // @ts-ignore
        async function add_identifier(){
            let type = (<HTMLInputElement>document.getElementById("section_metadata_identifiers_type")).value || null;
            let name = (<HTMLInputElement>document.getElementById("section_metadata_identifiers_name")).value || null;
            let value = (<HTMLInputElement>document.getElementById("section_metadata_identifiers_value")).value || null;

            if(type === null || name === null || value === null){
                Tools.show_alert("Please fill out all fields.", "warning");
                return;
            }

            let identifiers = section_data["metadata"]["identifiers"];
            let new_identifier = {
                "identifier_type": type,
                "name": name,
                "value": value
            };
            identifiers.push(new_identifier);

            let patch_data = {
                "metadata": {
                    "identifiers": identifiers,
                }
            };

            Tools.start_loading_spinner();

            try {
                let resp = await send_patch_section(globalThis.section_path, patch_data);
                // Get the new identifier from the response
                new_identifier = resp["metadata"]["identifiers"][identifiers.length-1];
                section_data["metadata"]["identifiers"] = resp["metadata"]["identifiers"];

                // @ts-ignore
                document.getElementById("section_metadata_identifiers_list").innerHTML += Handlebars.templates.editor_section_identifier_row(new_identifier);
                add_identifier_remove_handlers();
                add_quickchange_handlers();
            } catch (e) {
                console.error(e);
                Tools.show_alert("Failed to add identifier to section.", "danger");
                // Remove the identifier from the list again
                identifiers.splice(identifiers.length-1, 1);
            }
            Tools.stop_loading_spinner();
        }

        // @ts-ignore
        async function remove_identifier_handler(){
            let target = this;

            let identifier_row = target.closest(".section_metadata_identifier_row");
            let identifier_id = identifier_row.getAttribute("data-identifier-id");

            let identifiers = section_data["metadata"]["identifiers"];
            // Search identifier with id
            let identifier_index = -1;
            for(let i = 0; i < identifiers.length; i++){
                if(identifiers[i]["id"] === identifier_id){
                    identifier_index = i;
                    break;
                }
            }

            if(identifier_index === -1){
                Tools.show_alert("Failed to remove identifier from section.", "danger");
                console.log(section_data["metadata"]["identifiers"]);
                console.log("couldn't find identifier with id "+identifier_id);
                return;
            }
            identifiers.splice(identifier_index, 1);

            let patch_data = {
                "metadata": {
                    "identifiers": identifiers,
                }
            };

            Tools.start_loading_spinner();
            try{
                await send_patch_section(globalThis.section_path, patch_data);
                identifier_row.remove();
            }catch (e) {
                console.error(e);
                Tools.show_alert("Failed to remove identifier from section.", "danger");
            }
            Tools.stop_loading_spinner();
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
                    return response_data.data;
                }
            }
        }
    }
}