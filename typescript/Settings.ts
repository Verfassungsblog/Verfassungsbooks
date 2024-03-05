import * as Tools from "./tools";
import * as API from "./api_requests";

function add_user_management_listeners(){
    // Add save buttons:
    // @ts-ignore
    for(let el of document.getElementsByClassName("settings-save-user")){
        el.addEventListener("click", save_user_listener)
    }

    // Add delete buttons:
    // @ts-ignore
    for(let el of document.getElementsByClassName("settings-delete-user")){
        el.addEventListener("click", delete_user_listener)
    }

    // Add add user button:
    // @ts-ignore
    for(let el of document.getElementsByClassName("settings-add-user")){
        el.addEventListener("click", add_user_listener)
    }
}

async function save_user_listener(event: Event){
    let el = (event.target as HTMLElement).closest(".user_list_row");
    let user_id = el.getAttribute("data-user-id");
    if (user_id == null){
        Tools.show_alert("Failed to save user.", "danger");
        return;
    }

    let user_data = {
        "id": user_id,
        "name": (<HTMLInputElement>el.querySelector(".settings-user-username")).value || null,
        "email": (<HTMLInputElement>el.querySelector(".settings-user-email")).value || null,
    }
    let pw = (<HTMLInputElement>el.querySelector(".settings-user-password")).value;
    if (pw){
        // @ts-ignore
        user_data["password"] = pw;
    }

    if (user_data["name"] == null || user_data["email"] == null){
        Tools.show_alert("Email and username can't be empty", "danger")
        return;
    }

    try{
        await API.send_update_user(user_id, user_data);
        Tools.show_alert("User saved.", "success");
    }catch(e){
        Tools.show_alert("Failed to save user.", "danger");
        console.error(e)
    }
}

async function delete_user_listener(event: Event){
    let el = (event.target as HTMLElement).closest(".user_list_row");
    let user_id = el.getAttribute("data-user-id");
    if (user_id == null){
        Tools.show_alert("Failed to delete user.", "danger");
        return;
    }
    try{
        await API.send_delete_user(user_id);
        el.remove();
        Tools.show_alert("User deleted.", "success");
    }catch (e) {
        Tools.show_alert("Failed to delete user.", "danger");
        console.error(e)
    }
}

async function add_user_listener(event: Event){
    console.log("Adding user")
    let el = event.target as HTMLElement;
    let user_data = {
        "username": (<HTMLInputElement>document.getElementById("settings-new-user-username")).value || null,
        "password": (<HTMLInputElement>document.getElementById("settings-new-user-password")).value || null,
        "email": (<HTMLInputElement>document.getElementById("settings-new-user-email")).value || null,
    }

    if (user_data["username"] == null || user_data["password"] == null || user_data["email"] == null){
        Tools.show_alert("Please fill out all fields", "danger")
        return;
    }

    try {
        let user = await API.send_add_user(user_data);
        Tools.show_alert("User added.", "success");
        // Refresh the page
        window.location.reload();
    }catch (e) {
        Tools.show_alert("Failed to add user.", "danger");
        console.error(e)
    }
}
window.addEventListener("load", async function(){
    add_user_management_listeners();
});