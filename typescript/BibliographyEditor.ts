import * as Tools from './tools';
import * as API from './api_requests';

async function start(){
    // @ts-ignore
    globalThis.project_id = new URL(window.location.href).pathname.split("/")[2];

    // Show sidebar:
    // @ts-ignore
    document.getElementById("editor-sidebar").innerHTML = Handlebars.templates.bibliography_editor_sidebar();
    document.getElementById("bibeditor_sidebar_add_entry_btn").addEventListener("click", add_entry_handler);

    await load_bibliography_list();
}

async function load_bibliography_list(){
    try {
        // @ts-ignore
        let bib_list = await API.send_get_bib_list(globalThis.project_id);
        console.log(bib_list);

        // @ts-ignore
        document.getElementById("editor_sidebar_contents").innerHTML = Handlebars.templates.bibliography_editor_entries(bib_list.data);

        // @ts-ignore
        for(let el of document.getElementsByClassName("bibeditor_sidebar_entry")){
            el.addEventListener("click", load_bibliography_entry)
        }
    }catch (e) {
        console.error(e);
        Tools.show_alert(e, "danger");
    }
}

async function load_bibliography_entry(e: Event){
    let key = (<HTMLElement>e.target).getAttribute("data-key");
    try{
        // @ts-ignore
        let data = await API.send_get_bib_entry(key, globalThis.project_id);
        console.log(data)
    }catch(e){
        console.error(e);
        Tools.show_alert(e, "danger");
    }
}

async function add_entry_handler(){
    let data : {[index: string]:any} = {};
    data["entry_type"] = (<HTMLSelectElement>document.getElementById("bibeditor_sidebar_add_entry_type")).value || null;
    data["key"] = (<HTMLInputElement>document.getElementById("bibeditor_sidebar_add_entry_key")).value || null;

    if(data["entry_type"] == null || data["key"] == null){
        Tools.show_alert("You need to supply a Key and select a Type!", "danger");
        return;
    }

    try {
        // @ts-ignore
        let res = await API.send_add_new_bib_entry(data, globalThis.project_id);
        console.log(res);
        await load_bibliography_list();
    }catch (e) {
        console.error(e);
        Tools.show_alert(e, "danger");
    }
}

window.addEventListener("load", async function(){
    start();
});