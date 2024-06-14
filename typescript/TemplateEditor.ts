// Import API functions
import { TemplateAPI, ProjectTemplateV2} from "./api_requests";
import * as Tools from "./tools";

import {EditorView, basicSetup} from "codemirror"
import {html} from "@codemirror/lang-html"

let typing_timer: any | null = null;
let template_api = TemplateAPI();
let template_data: ProjectTemplateV2 | null = null;
let editor : EditorView | null = null;

async function tstart(){
    // Get template_id from URL (last part of the URL)
    let url = new URL(window.location.href);
    let template_id = url.pathname.split("/").pop();
    if(template_id == null){
        console.error("Template ID not found in URL, cannot continue.");
        return;
    }

    // Load the current template data

    try{
        template_data = await template_api.read_template(template_id);
        console.log(template_data);

        // Add Sidebar:
        let sidebar = document.getElementById("template_editor_sidebar");
        // @ts-ignore
        sidebar.innerHTML = Handlebars.templates.template_editor_sidebar(template_data);

        // Add Main:
        show_metadata();
    }catch(e){
        console.error("Error loading template data: ", e);
        // Show error message
        Tools.show_alert("Error loading Template Editor :( ", "danger");
    }

    // Add event listeners
    document.getElementById("template_editor_sidebar_new_export_format_btn").addEventListener("click", add_export_format_handler);
    document.getElementById("template_editor_global_assets_btn").addEventListener("click", show_global_assets);


    // Event listeners for context menu:
    document.addEventListener('click', function(event) {
        let contextmenu = document.getElementById("template_editor_assets_contextmenu");
        if(!contextmenu || !event.target){
            return;
        }
        let isClickInside = contextmenu.contains(event.target as Node);
    
        if (!isClickInside) {
            // The click was outside the contextmenu, hide it.
            contextmenu.classList.add("hide");
        }
    });
}


function show_metadata(){
    let main = document.getElementById("template_editor_main_panel");
    // @ts-ignore
    main.innerHTML = Handlebars.templates.template_editor_metadata(template_data);
    let elements = Array.from(document.getElementsByClassName("quickchange"));
    for(let element of elements){
        element.addEventListener("input", change_metadata_handler);
    }
}

async function show_global_assets(){
    console.log("Loading global asset list");
    let main = document.getElementById("template_editor_main_panel");
    let assets = await template_api.list_global_assets(template_data.id);
    
    // @ts-ignore
    main.innerHTML = Handlebars.templates.template_editor_assets(assets);
    console.log(assets);

    // Get a list of all asset rows
    let asset_rows = Array.from(document.getElementsByClassName("asset_row"));
    
    for(let row of asset_rows){
        // Add drag listeners
        row.addEventListener("dragstart", drag_start_handler);
        // Add contextmenu listener
        row.addEventListener("contextmenu", show_asset_context_menu);
    }

    // Add dropzones to folder rows
    let dropzones = Array.from(document.getElementsByClassName("folder_row_top"));
    for(let dropzone of dropzones){
        dropzone.addEventListener("drop", drop_handler);
        dropzone.addEventListener("dragover", drag_over_handler);
    }
    // Add global dropzone
    var dropzone_before = document.getElementById("template_editor_asset_rows_before");
    var dropzone_after = document.getElementById("template_editor_asset_rows_after");
    dropzone_before.addEventListener("drop", drop_handler);
    dropzone_before.addEventListener("dragover", drag_over_handler);
    dropzone_after.addEventListener("drop", drop_handler);
    dropzone_after.addEventListener("dragover", drag_over_handler);

    // Add file click listeners (open/download)
    let file_rows = Array.from(document.getElementsByClassName("file_row_icon+name"));
    for(let file_row of file_rows){
        file_row.addEventListener("click", file_row_click_handler);
    }

    // Add menu listeners
    document.getElementById("template_editor_assets_menu_new_folder_btn").addEventListener("click", new_folder_handler);
    document.getElementById("template_editor_assets_menu_new_folder_dialog_create").addEventListener("click", create_folder_handler);
    document.getElementById("template_editor_assets_menu_select_all_btn").addEventListener("click", select_deselect_all_handler);
    document.getElementById("template_editor_assets_menu_delete_btn").addEventListener("click", delete_selected_handler);
    document.getElementById("template_editor_assets_menu_upload_btn").addEventListener("click", upload_asset_handler);

    // Add contextmenu listener
    document.getElementById("template_editor_assets_contextmenu_rename").addEventListener("click", show_contextmenu_rename_dialog);
    document.getElementById("template_editor_assets_contextmenu_rename_dialog_btn").addEventListener("click", save_new_asset_name);
}

function show_contextmenu_rename_dialog(){
    let context = document.getElementById("template_editor_assets_contextmenu").getAttribute("data-context-path");
    if(!context){
        return;
    }

    let dialog = document.getElementById("template_editor_assets_contextmenu_rename_dialog") as HTMLElement;
    let name_input = document.getElementById("template_editor_assets_contextmenu_rename_dialog_input") as HTMLInputElement;
    name_input.value = document.getElementById("Path-"+context).getAttribute("data-name");
    dialog.setAttribute("data-path", context);
    dialog.classList.remove("hide");
}

async function save_new_asset_name(){
    let input = document.getElementById("template_editor_assets_contextmenu_rename_dialog_input") as HTMLInputElement;
    let dialog = document.getElementById("template_editor_assets_contextmenu_rename_dialog") as HTMLDivElement;

    let path = dialog.getAttribute("data-path");
    let new_name = input.value;
    let path_parts = path.split("/");
    // Change last part of path to new name
    path_parts[path_parts.length - 1] = new_name;
    let new_path = path_parts.join("/");
    
    console.log("Moving " +path+" to "+new_path);
    try{
        await template_api.move_global_asset(template_data.id, path, new_path, false);
        show_global_assets();
    }catch(e){
        Tools.show_alert(e, "danger");
    }
    dialog.classList.add("hide");

}

function show_asset_context_menu(e: MouseEvent){
    e.preventDefault();
    let target = e.target as HTMLElement;
    let asset_row;

    if(target.classList.contains("asset_row")){
        asset_row = target;
    }else{
        asset_row = target.closest(".asset_row");
    }
    let contextmenu = document.getElementById("template_editor_assets_contextmenu");
    contextmenu.setAttribute("data-context-path", asset_row.getAttribute("data-path"));
    contextmenu.style.left = e.x + "px";
    contextmenu.style.top = e.y + "px";
    contextmenu.classList.remove("hide");
}

async function file_row_click_handler(){
    let row = this.closest(".file_row");
    try{
        let result = await template_api.get_asset_file(template_data.id, row.getAttribute("data-path"));
        if(result.type == "blob"){
            const url = URL.createObjectURL(result.data as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = row.getAttribute("data-name");
            a.target = "_blank";
            a.click();
        }else if(result.type == "text"){
            // Show text edit
            show_text_file_editor(row.getAttribute("data-name"), row.getAttribute("data-path"), result.data as string);
        }
        console.log(result);
    }catch(e){
        Tools.show_alert(e, "danger");
        return;
    }
}

async function show_text_file_editor(name: string, path: string, content: string){
    let main = document.getElementById("template_editor_asset_edit");
    
    // @ts-ignore
    main.innerHTML = Handlebars.templates.template_editor_asset_edit({name: name, path: path, content: content});

    let save_btn = document.getElementById("template_editor_asset_edit_save_btn");
    // Enable save button if name is changed
    document.getElementById("template_editor_asset_edit_name").addEventListener("input", function(){
        save_btn.removeAttribute("disabled");
    });
    save_btn.addEventListener("click", update_text_asset);

    editor = new EditorView({
        doc: content,
        extensions: [basicSetup, html(), EditorView.updateListener.of(function(e) {
            if (e.docChanged) { // Enable save button if content is changed
                let save_btn = document.getElementById("template_editor_asset_edit_save_btn");
                save_btn.removeAttribute("disabled");
            } 
        })],
        parent: document.getElementById("template_editor_assset_edit_editor"),
    });
}

async function update_text_asset(e: Event){
    let target = e.target as HTMLElement;
    let path = target.getAttribute("data-path");
    let old_name = (document.getElementById("template_editor_asset_edit_name") as HTMLElement).getAttribute("data-old-name");
    let name = (document.getElementById("template_editor_asset_edit_name") as HTMLElement).innerText;
    let content = editor.state.doc.toString();
    
    try{
        //Update content
        await template_api.update_asset_text_file(template_data.id, path, content);

        //Update name if changed
        if(name !== old_name){
            let path_parts = path.split("/");
            // Change last part of path to new name
            path_parts[path_parts.length - 1] = name;
            let new_path = path_parts.join("/");
            await template_api.move_global_asset(template_data.id, path, new_path, false);
        }

        // Disable save button after saving
        target.setAttribute("disabled", "true");
        await show_global_assets();
    }catch(e){
        Tools.show_alert(e, "danger");
        return;
    }
}

function upload_asset_handler(){
    var input = document.createElement("input");
    input.type = "file";

    input.addEventListener("change", async function(){
        let file = (input.files as FileList)[0];
        try{
            await template_api.upload_file(template_data.id, file);
            show_global_assets();
        }catch(e){
            Tools.show_alert(e, "danger");
            return;
        }
    });
    input.click();
}

async function delete_selected_handler(){
    
    let checkboxes = Array.from(document.getElementsByClassName("asset_row_check")) as HTMLInputElement[];
    let checkedCheckboxes = checkboxes.filter(checkbox => checkbox.checked);
    let selectedPaths = checkedCheckboxes.map(checkbox => checkbox.closest(".asset_row").getAttribute("data-path"));
    console.log(selectedPaths);
    // Perform delete operation using selectedPaths
    try{
        await template_api.delete_assets(template_data.id, selectedPaths);
        show_global_assets();
    }catch(e){
        Tools.show_alert(e, "danger");
        return;
    }
}

function new_folder_handler(){
    let dialog = document.getElementById("template_editor_assets_menu_new_folder_dialog");
    dialog.classList.toggle("hide");
}

async function create_folder_handler(){
    let folder_name = (document.getElementById("template_editor_assets_menu_new_folder_dialog_name") as HTMLInputElement).value;

    if(folder_name == ""){
        Tools.show_alert("Folder name cannot be empty", "danger");
        return;
    }

    try{
        await template_api.create_folder(template_data.id, folder_name);
        show_global_assets();
    }catch(e){
        Tools.show_alert(e, "danger");
        return;
    }
}

async function drop_handler(event: DragEvent){
    event.preventDefault();
    // Old path before being moved
    var old_path = event.dataTransfer.getData("text");
    var dropped_element = document.getElementById("Path-"+old_path);

    let new_path;
    if((event.target as HTMLElement).classList.contains("template_editor_global_drop_zone")){
        // New Path after being moved: Just the filename
        new_path = dropped_element.getAttribute("data-name");
    }else{
        var current_folder = (event.target as HTMLElement).closest(".folder_row");
        var folder_content = current_folder.getElementsByClassName("folder_contents")[0];
        //folder_content.appendChild(dropped_element); no longer needed since we will update the whole list

        // New Path after being moved: Current Folder Path + Filename
        new_path = current_folder.getAttribute("data-path")+"/"+dropped_element.getAttribute("data-name");
    }

    if (old_path != new_path){
        let overwrite_option = false;
        // Check if new_path already exists
        let existing_element = document.getElementById("Path-"+new_path);
        if(existing_element){
            let confirm = window.confirm("An element with the same name already exists in this folder. Do you want to replace it?");
            if(confirm){
                overwrite_option = true;
            }else{
                return;
            }
        }

        console.log("Moving ", old_path, " to ", new_path);
        try{
            await template_api.move_global_asset(template_data.id, old_path, new_path, overwrite_option);
            show_global_assets();
        }catch(e){
            Tools.show_alert(e, "danger");
            return;
        }
    }
}

function drag_over_handler(event: DragEvent){
    event.preventDefault();
}

function drag_start_handler(event: DragEvent){
    event.dataTransfer.setData("text", (event.target as HTMLElement).getAttribute("data-path"));
}

async function add_export_format_handler() {
    let name = (document.getElementById("template_editor_sidebar_new_export_format_name") as HTMLInputElement).value;

    try {
        let res = await template_api.create_export_format(template_data.id, name)
        await tstart();
    } catch (e) {
        Tools.show_alert(e, "danger");
    }
}

function change_metadata_handler(){
    // Wait for 1 second after the last keypress before saving
    if(typing_timer != null){
        clearTimeout(typing_timer);
    }
    typing_timer = setInterval(save_metadata, 1000)
}

function select_deselect_all_handler(){
    let checkboxes = Array.from(document.getElementsByClassName("asset_row_check"));

    // Check if all are checked
    let all_checked = true;
    for(let checkbox of checkboxes){
        if(!(checkbox as HTMLInputElement).checked){
            all_checked = false;
            break;
        }
    }

    if(all_checked){
        for(let checkbox of checkboxes){
            (checkbox as HTMLInputElement).checked = false;
        }
    }else{
        for(let checkbox of checkboxes){
            (checkbox as HTMLInputElement).checked = true;
        }
    }
}

async function save_metadata(){
    clearTimeout(typing_timer);
    let template_name = document.getElementById("template_name").innerText.trim() || null;
    let template_description = document.getElementById("template_description").innerHTML.trim() || null;

    if (!template_name || !template_description){
        return;
    }
    template_data.name = template_name;
    template_data.description = template_description;
    console.log(template_data);

    // Save the metadata
    await template_api.update_template(template_data);
}

window.addEventListener("load", async function(){
    tstart();
});