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

async function save_changed_entry(){
    console.log("trying to save changes.");
    let old_key = (<HTMLInputElement>document.getElementById("old_key")).value;
    let new_data: any = {};
    new_data["key"] = (<HTMLInputElement>document.getElementById("bibedit_entry_key")).value || null;
    new_data["entry_type"] = (<HTMLInputElement>document.getElementById("bibedit_entry_type")).value || null;
    if((<HTMLTextAreaElement>document.getElementById("bibedit_entry_abstract")).value){
        new_data["abstractt"] = {
            "short": null,
            "value": (<HTMLTextAreaElement>document.getElementById("bibedit_entry_abstract")).value
        }
    }else{
        new_data["abstractt"] = null;
    }
    new_data["affiliated"] = [];
    new_data["annote"] = null;
    new_data["archive"] = null;
    new_data["archive_location"] = null;
    new_data["call_number"] = null;
    new_data["authors"] = [];
    // @ts-ignore
    for(let author_row of document.getElementsByClassName("bibedit_entry_authors")){
        let author: any = {};
        author["alias"] = (<HTMLInputElement>(author_row.getElementsByClassName("person_alias")[0])).value || null;
        author["given_name"] = (<HTMLInputElement>(author_row.getElementsByClassName("person_given_name")[0])).value || null;
        author["name"] = (<HTMLInputElement>(author_row.getElementsByClassName("person_name")[0])).value || null;
        author["prefix"] = (<HTMLInputElement>(author_row.getElementsByClassName("person_prefix")[0])).value || null;
        author["suffix"] = (<HTMLInputElement>(author_row.getElementsByClassName("person_suffix")[0])).value || null;


        if(author["name"] != null){ // Only add author if it has at least a name
            new_data["authors"].push(author);
        }
    }

    new_data["editors"] = [];
    // @ts-ignore
    for(let editor_row of document.getElementsByClassName("bibedit_entry_editors")){
        console.log(editor_row);
        let editor: any = {};
        editor["alias"] = (<HTMLInputElement>(editor_row.getElementsByClassName("person_alias")[0])).value || null;
        editor["given_name"] = (<HTMLInputElement>(editor_row.getElementsByClassName("person_given_name")[0])).value || null;
        editor["name"] = (<HTMLInputElement>(editor_row.getElementsByClassName("person_name")[0])).value || null;
        editor["prefix"] = (<HTMLInputElement>(editor_row.getElementsByClassName("person_prefix")[0])).value || null;
        editor["suffix"] = (<HTMLInputElement>(editor_row.getElementsByClassName("person_suffix")[0])).value || null;

        if(editor["name"] != null){ // Only add editor if it has at least a name
            new_data["editors"].push(editor);
        }
    }

    let date = (<HTMLInputElement>document.getElementById("bibedit_entry_date")).value;
    let date_parts = date.split("-");

    if(date_parts.length == 3) {
        new_data["date"] = {
            "year": parseInt(date_parts[0]),
            "month": parseInt(date_parts[1]),
            "day": parseInt(date_parts[2]),
            "approximate": false,
        };
    }else{
        new_data["date"] = null;
    }

    let edition = (<HTMLInputElement>document.getElementById("bibedit_entry_edition")).value || null;
    if(edition){
        new_data["edition"] = {
            "String": edition
        }
    }else{
        new_data["edition"] = null;
    }
    
    new_data["genre"] = null;
    let issue = (<HTMLInputElement>document.getElementById("bibedit_entry_issue")).value || null;
    if(issue){
        new_data["issue"] = {
            String: issue
        }
    }

    new_data["language"] = null;

    let location = (<HTMLInputElement>document.getElementById("bibedit_entry_location")).value || null;
    if(location){
        new_data["location"] = {
            "short": null,
            "value": location
        }
    }else{
        new_data["location"] = null;
    }


    new_data["note"] = null;
    const organizationInput = document.getElementById("bibedit_entry_organization") as HTMLInputElement;
    const organization = organizationInput.value || null;
    if (organization) {
        new_data["organization"] = { "short": null, "value": organization };
    } else {
        new_data["organization"] = null;
    }
    new_data["page_range"] = (<HTMLInputElement>document.getElementById("bibedit_entry_page_range")).value || null;
    let page_range = (<HTMLInputElement>document.getElementById("bibedit_entry_page_range")).value || null;
    if(page_range){
        new_data["page_range"] = {
            "String": page_range
        }
    }else{
        new_data["page_range"] = null;
    }

    let page_total = (<HTMLInputElement>document.getElementById("bibedit_entry_page_total")).value || null;
    if(page_total){
        new_data["page_total"] = {value: {Number: parseInt(page_total)}};
    }else{
        new_data["page_total"] = null;
    }

    const publisherInput = document.getElementById("bibedit_entry_publisher") as HTMLInputElement;
    const publisher = publisherInput.value || null;
    if (publisher) {
        new_data["publisher"] = { "short": null, "value": publisher };
    } else {
        new_data["publisher"] = null;
    }

    let runtime = (<HTMLInputElement>document.getElementById("bibedit_entry_runtime")).value || null;
    if(runtime){
        new_data["runtime"] = {
            "String": runtime
        }
    }else{
        new_data["runtime"] = null;
    }

    let time_range = (<HTMLInputElement>document.getElementById("bibedit_entry_time_range")).value || null;

    if(time_range){
        new_data["time_range"] = {
            "String": time_range
        }
    }else{
        new_data["time_range"] = null;
    }


    let isbn = (<HTMLInputElement>document.getElementById("bibedit_entry_isbn")).value;
    let issn = (<HTMLInputElement>document.getElementById("bibedit_entry_issn")).value;
    let doi = (<HTMLInputElement>document.getElementById("bibedit_entry_doi")).value;
    if (isbn || issn || doi){
        new_data["serial_numbers"] = {};
        if(isbn){
            new_data["serial_numbers"]["isbn"] = isbn;
        }
        if(issn){
            new_data["serial_numbers"]["issn"] = issn;
        }

        if(doi){
            new_data["serial_numbers"]["doi"] = doi;
        }
    }

    let title = (<HTMLInputElement>document.getElementById("bibedit_entry_title")).value || null;

    if(title){
        new_data["title"] = {
            "short": (<HTMLInputElement>document.getElementById("bibedit_entry_short_title")).value || null,
            "value": title
        }
    }else{
        new_data["title"] = null;
    }

    let url = (<HTMLInputElement>document.getElementById("bibedit_entry_url")).value || null;

    if(url != null){
        new_data["url"] = {
            "value": url,
            "visit_date": null,
        }
    }else{
        new_data["url"] = null;
    }

    if((<HTMLInputElement>document.getElementById("bibedit_entry_visit_date")).value){
        let visit_date = (<HTMLInputElement>document.getElementById("bibedit_entry_visit_date")).value;
        let date_parts = visit_date.split("-");

        new_data["url"]["visit_date"] = {
            "year": parseInt(date_parts[0]),
            "month": parseInt(date_parts[1]),
            "day": parseInt(date_parts[2]),
            "approximate": false,
        };
    }

    let volume = (<HTMLInputElement>document.getElementById("bibedit_entry_volume")).value || null;
    if(volume){
        new_data["volume"] = {
            "String": volume
        }
    }else{
        new_data["volume"] = null;
    }
    let volume_total = (<HTMLInputElement>document.getElementById("bibedit_entry_volume_total")).value || null;
    if(volume_total){
        new_data["volume_total"] = {value: {Number: parseInt(volume_total)}};
    }else{
        new_data["volume_total"] = null;
    }

    console.log(new_data);

    try {
        // @ts-ignore
        let res = await API.update_bib_entry(new_data, old_key, globalThis.project_id);
        console.log(res);
        Tools.show_alert("Changes saved!", "success");
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

        if(data.data.url && data.data.url["visit_date"]){
            let visit_date = data.data.url["visit_date"];
            let month = visit_date["month"];
            if(month < 10){
                month = "0"+month;
            }
            let day = visit_date["day"];
            if(day < 10){
                day = "0"+day;
            }
            let date = visit_date["year"]+"-"+month+"-"+day;
            data.data.url["visit_date"] = date;
        }

        if(data.data.date){
            let old_date = data.data.date;
            let month = old_date["month"];
            if(month == null){
                month = 1;
            }
            if(month < 10){
                month = "0"+month;
            }
            let day = old_date["day"];
            if(day == null){
                day = 1;
            }
            if(day < 10){
                day = "0"+day;
            }
            let date = old_date["year"]+"-"+month+"-"+day;
            data.data.date = date;
        }

        // @ts-ignore
        document.getElementsByClassName("editor-details")[0].innerHTML = Handlebars.templates.bibliography_editor_entry(data.data);
        let select = document.getElementById("bibedit_entry_type") as HTMLSelectElement;
        select.value = data.data.entry_type[0].toUpperCase() + data.data.entry_type.slice(1);

        // Add change listeners:
        // @ts-ignore
        for(let el of document.getElementsByClassName("bibedit_chg_lstn")){
            el.addEventListener("change", save_changed_entry);
        }

        let delete_person_lstn = async function () {
            let tentry_row = this.closest(".bibedit_entry_editors");
            if (tentry_row) {
                tentry_row.remove();
            }
            let entry_row = this.closest(".bibedit_entry_authors");
            if (entry_row) {
                entry_row.remove();
            }

            await save_changed_entry();
        }

        // @ts-ignore
        for(let el of document.getElementsByClassName("person_delete_btn")){
            el.addEventListener("click", delete_person_lstn);
        }

        document.getElementById("bibedit_entry_add_editor").addEventListener("click", function(){
            let editor_row = document.createElement("div");
            editor_row.classList.add("bibedit_entry_editors");
            // @ts-ignore
            editor_row.innerHTML = Handlebars.templates.bibliography_editor_entry_person_row();
            document.getElementById("editors").append(editor_row);

            // @ts-ignore
            for(let el of document.getElementsByClassName("person_delete_btn")){
                el.addEventListener("click", delete_person_lstn);
            }
            // @ts-ignore
            for(let el of document.getElementsByClassName("bibedit_chg_lstn")){
                el.addEventListener("change", save_changed_entry);
            }
        })

        document.getElementById("bibedit_entry_add_author").addEventListener("click", function(){
            let author_row = document.createElement("div");
            author_row.classList.add("bibedit_entry_authors");
            // @ts-ignore
            author_row.innerHTML = Handlebars.templates.bibliography_editor_entry_person_row();
            document.getElementById("authors").append(author_row);

            // @ts-ignore
            for(let el of document.getElementsByClassName("person_delete_btn")){
                el.addEventListener("click", delete_person_lstn);
            }
            // @ts-ignore
            for(let el of document.getElementsByClassName("bibedit_chg_lstn")){
                el.addEventListener("change", save_changed_entry);
            }
        })

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