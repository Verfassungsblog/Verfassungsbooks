export async function export_project_listener(){
    let overlay_wrapper = document.getElementById("overlay-wrapper");
    let overlay_content = document.getElementById("inner_overlay");
    overlay_wrapper.classList.remove("hide");

    document.getElementById("overlay_close_btn").addEventListener("click", function(){
        overlay_wrapper.classList.add("hide");
        overlay_content.innerHTML = "";
    });
    // @ts-ignore
    overlay_content.innerHTML = Handlebars.templates.editor_export_wizard();
}