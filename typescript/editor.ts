import EditorJS from "@editorjs/editorjs";
import Header from '@editorjs/header';
// @ts-ignore
import RawTool from '@editorjs/raw';
// @ts-ignore
import List from "@editorjs/list";
import * as API from "./api_requests";
import * as Tools from "./tools";

const FootnotesTune = require('@editorjs/footnotes');

let typing_timer: number | null = null;
let editor: EditorJS | null = null;

export async function show_editor(){
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
                    tunes: ['footnotes'],
                    config: {
                        defaultStyle: 'unordered'
                    }
                },
                footnotes: {
                    class: FootnotesTune,
                },
                paragraph: {
                    tunes: ['footnotes'],
                },
            },
            data: {blocks: data}
        });

        await editor.isReady;
        document.getElementById("section_content_blocks_inner").addEventListener("input", typing_handler);
    }catch(e){
        console.error(e);
        Tools.show_alert("Couldn't load content.", "danger");
    }
}

async function save_changes(){
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
    }, 1000);
}

window.addEventListener("load", async function(){
    // @ts-ignore
    window.show_new_editor = () => {show_editor()};
});
