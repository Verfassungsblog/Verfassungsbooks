import * as Tools from "./tools";
import * as API from "./api_requests";

function import_btn_handler(){
    let overlay_wrapper = document.getElementById("overlay-wrapper");
    let overlay_content = document.getElementById("inner_overlay");
    overlay_wrapper.classList.remove("hide");

    document.getElementById("overlay_close_btn").addEventListener("click", function(){
        overlay_wrapper.classList.add("hide");
        overlay_content.innerHTML = "";
    });

    // @ts-ignore
    overlay_content.innerHTML = Handlebars.templates.editor_import_wizard();
    document.getElementById("wizard-pandoc-btn").addEventListener("click", function(){
        document.getElementById("wizard-start").classList.add("hide");
        document.getElementById("wizard-pandoc-1").classList.remove("hide");
    });
    document.getElementById("wizard-pandoc-upload-btn").addEventListener("click", upload_files_handler);
}

async function upload_files_handler(){
    let files = (<HTMLInputElement>document.getElementById("wizard-pandoc-upload-input")).files;
    if(files.length == 0){
        Tools.show_alert("You have to select at least one file to upload", "error");
        return;
    }

    let formData = new FormData();
    for(let i = 0; i < files.length; i++){
        formData.append("files", files[i]);
    }

    // @ts-ignore
    formData.append("project_id", globalThis.project_id);

    try {
        await API.send_import_from_upload(formData)
    }catch (e) {
        console.error(e);
        Tools.show_alert("Failed to upload files", "error");
    }
    //TODO: poll for status

}

window.addEventListener("load", async function(){
    // @ts-ignore
    window.add_import_listeners = () => {document.getElementById("editor_sidebar_import").addEventListener("click", import_btn_handler)}
});