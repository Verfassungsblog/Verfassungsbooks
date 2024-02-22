import EditorJS from "@editorjs/editorjs";
import Header from '@editorjs/header';
// @ts-ignore
import RawTool from '@editorjs/raw';
import {NoteTool} from "./NoteTool";
// @ts-ignore
import List from "@editorjs/list";
import * as API from "./api_requests";
import * as Tools from "./tools";
import * as RenderPDF from "./RenderPDF";

let typing_timer: number | null = null;
let editor: EditorJS | null = null;

export async function show_editor(){
    document.getElementById("editor_render_project_btn").addEventListener("click", RenderPDF.render_project_listener);
    try {
        // @ts-ignore
        let data = (await API.send_get_content_blocks(globalThis.project_id, globalThis.section_path)).data;
        console.log(data);

        editor = new EditorJS({
            holder: "section_content_blocks_inner",
            tools: {
                header: Header,
                raw: RawTool,
                list: {
                    class: List,
                    inlineToolbar: true,
                    config: {
                        defaultStyle: 'unordered'
                    }
                },
                note: NoteTool
            },
            data: {blocks: data},
            onChange: (api, event) => {
                save_changes();
            }
        });

        await editor.isReady;
        document.getElementById("section_content_blocks_inner").addEventListener("input", typing_handler);

        // Make all existing notes clickable
        NoteTool.add_all_show_note_settings_listeners();
    }catch(e){
        console.error(e);
        Tools.show_alert("Couldn't load content.", "danger");
    }
}

export async function save_changes(){
    let data = await editor.save();
    console.log(data);

    try {
        // @ts-ignore
        await API.send_update_content_blocks(globalThis.project_id, globalThis.section_path, data.blocks);
        Tools.show_alert("Saved Changes.", "success");
    }catch(e){
        console.error(e);
        Tools.show_alert("Couldn't save content.", "danger");
    }
}

function typing_handler(){
    if (typing_timer) {
        clearTimeout(typing_timer);
    }

    // Set a timeout to wait for the user to stop typing
    // @ts-ignore
    typing_timer = setTimeout(async function(){
        await save_changes();
    }, 500);
}

window.addEventListener("load", async function(){
    // @ts-ignore
    window.show_new_editor = () => {show_editor()};
});
