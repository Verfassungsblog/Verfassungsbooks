var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/// <reference path="Editor-old.ts" />
var Editor;
/// <reference path="Editor-old.ts" />
(function (Editor) {
    let ProjectOverview;
    (function (ProjectOverview) {
        function show_overview() {
            console.log("Loading overview for project " + globalThis.project_id);
            let project_data = load_project_metadata(globalThis.project_id);
            let project_settings = load_project_settings(globalThis.project_id);
            let build_sidebar = Editor.Sidebar.build_sidebar();
            Tools.start_loading_spinner();
            // @ts-ignore
            Promise.all([project_data, project_settings, build_sidebar]).then(function (values) {
                return __awaiter(this, void 0, void 0, function* () {
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
                        //TODO: implement a order or sort
                        Tools.start_loading_spinner();
                        try {
                            // @ts-ignore
                            let values = yield Promise.all(promises);
                            Tools.stop_loading_spinner();
                            console.log(values);
                            if (values.length !== data["metadata"]["authors"].length) {
                                console.log("Failed to load all authors");
                                Tools.show_alert("Failed to load all authors", "danger");
                            }
                            else {
                                data["metadata"]["authors"] = values;
                            }
                        }
                        catch (e) {
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
                            let values = yield Promise.all(promises);
                            Tools.stop_loading_spinner();
                            console.log(values);
                            if (values.length !== data["metadata"]["editors"].length) {
                                console.log("Failed to load all editors");
                                Tools.show_alert("Failed to load all editors", "danger");
                            }
                            else {
                                data["metadata"]["editors"] = values;
                            }
                        }
                        catch (e) {
                            Tools.stop_loading_spinner();
                            console.log(e);
                            Tools.show_alert("Failed to load all editors", "danger");
                        }
                    }
                    if (data["metadata"] != null && data["metadata"]["languages"] != null) {
                        // Set each entry to true if it is in the languages array
                        let languages = {};
                        for (let language of data["metadata"]["languages"]) {
                            languages[language] = true;
                        }
                        data["metadata"]["languages"] = languages;
                    }
                    if (data["metadata"] != null && data["metadata"]["license"] != null) {
                        let license = data["metadata"]["license"];
                        data["metadata"]["license"] = {};
                        data["metadata"]["license"][license] = true;
                    }
                    console.log(data);
                    // @ts-ignore
                    let details = Handlebars.templates.editor_main_project_overview(data);
                    document.getElementsByClassName("editor-details")[0].innerHTML = details;
                    // Show selected DDC
                    if (data["metadata"] != null && data["metadata"]["ddc"] != null) {
                        let ddc = data["metadata"]["ddc"];
                        console.log("DDC is:" + ddc);
                        //Split ddc into three digits
                        let ddc_first_level = ddc.substring(0, 1);
                        let ddc_second_level = ddc.substring(0, 2);
                        let ddc_third_level = ddc.substring(0, 3);
                        let first_level = document.getElementById("project_metadata_ddc_main_classes");
                        first_level.value = ddc_first_level;
                        let second_level = document.getElementById("project_metadata_ddc_" + ddc_first_level);
                        second_level.value = ddc_second_level;
                        second_level.classList.remove("hide");
                        let third_level = document.getElementById("project_metadata_ddc_" + ddc_second_level);
                        if (third_level) {
                            third_level.value = ddc_third_level;
                            third_level.classList.remove("hide");
                        }
                        else {
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
                    for (let button of document.getElementsByClassName("project_metadata_keywords_remove")) {
                        button.addEventListener("click", remove_keyword_btn_handler);
                    }
                    //Add listener to add keyword button
                    document.getElementById("project_metadata_keyword_add_without_gnd_btn").addEventListener("click", add_keyword_without_gnd_handler);
                    // Add listeners to all input fields to update on change
                    // @ts-ignore
                    for (let input of document.getElementsByClassName("project_metadata_field")) {
                        input.addEventListener("change", update_metadata);
                    }
                    //Add listener to keyword search
                    document.getElementById("project_metadata_keyword_search").addEventListener("input", search_gnd_keyword);
                    document.getElementById("project_metadata_keyword_search").addEventListener("click", search_gnd_keyword);
                    // Add listener to add identifier button
                    document.getElementById("project_metadata_identifiers_add").addEventListener("click", add_identifier_btn_handler);
                    // Add listeners to all remove identifier buttons
                    // @ts-ignore
                    for (let button of document.getElementsByClassName("project_metadata_identifier_remove_btn")) {
                        button.addEventListener("click", remove_identifier_btn_handler);
                    }
                });
            }, function (error) {
                // @ts-ignore
                Tools.stop_loading_spinner();
                alert("Failed to load project");
                console.log(error);
            });
        }
        ProjectOverview.show_overview = show_overview;
        // @ts-ignore
        function remove_identifier_btn_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let target = e.target;
                let li = target.closest(".project_metadata_identifier_row");
                let identifier_id = li.getAttribute("data-identifier-id");
                Tools.start_loading_spinner();
                try {
                    yield send_remove_identifier_request(identifier_id);
                    Tools.stop_loading_spinner();
                    li.remove();
                    Tools.show_alert("Identifier removed.", "success");
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to remove identifier.", "danger");
                    console.error(e);
                }
            });
        }
        // @ts-ignore
        function add_identifier_btn_handler() {
            return __awaiter(this, void 0, void 0, function* () {
                let identifier = {};
                identifier["identifier_type"] = document.getElementById("project_metadata_identifiers_type").value || null;
                identifier["value"] = document.getElementById("project_metadata_identifiers_value").value || null;
                identifier["name"] = document.getElementById("project_metadata_identifiers_name").value || null;
                if (!identifier["identifier_type"] || !identifier["value"] || !identifier["name"]) {
                    Tools.show_alert("Couldn't add Identifier: Please fill out all fields.", "danger");
                    return;
                }
                try {
                    Tools.start_loading_spinner();
                    let response = yield send_add_identifier_request(identifier);
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Identifier added.", "success");
                    // @ts-ignore
                    document.getElementById("project_metadata_identifiers_list").innerHTML += Handlebars.templates.editor_add_identifier_row(response.data);
                    //Add remove handler:
                    // @ts-ignore
                    for (let button of document.getElementsByClassName("project_metadata_identifier_remove_btn")) {
                        button.addEventListener("click", remove_identifier_btn_handler);
                    }
                    // Clear input fields
                    document.getElementById("project_metadata_identifiers_value").value = "";
                    document.getElementById("project_metadata_identifiers_name").value = "";
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to add identifier.", "danger");
                    console.error(e);
                }
            });
        }
        function send_remove_identifier_request(identifier_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/identifiers/${identifier_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to send remove identifier request`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to remove identifier: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        function send_add_identifier_request(identifier) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/identifiers/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(identifier)
                });
                if (!response.ok) {
                    throw new Error(`Failed to send add identifier request`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to remove keyword: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        // @ts-ignore
        function add_keyword_without_gnd_handler() {
            return __awaiter(this, void 0, void 0, function* () {
                let keyword = {};
                let searchbar = document.getElementById("project_metadata_keyword_search");
                keyword["title"] = searchbar.value;
                keyword["gnd"] = null;
                try {
                    Tools.start_loading_spinner();
                    yield send_add_keyword_request(keyword);
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
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to add keyword.", "danger");
                    console.error(e);
                }
            });
        }
        // @ts-ignore
        function search_gnd_keyword() {
            return __awaiter(this, void 0, void 0, function* () {
                let search_term = document.getElementById("project_metadata_keyword_search").value;
                if (search_term === "") {
                    return;
                }
                console.log("Searching for keyword " + search_term);
                try {
                    Tools.start_loading_spinner();
                    let response = yield send_gnd_api_search_request(search_term);
                    Tools.stop_loading_spinner();
                    let result_ul = document.getElementById("project_metadata_keyword_search_result");
                    result_ul.innerHTML = "";
                    result_ul.classList.remove("hide");
                    let hide_results = function (e) {
                        let target = e.target;
                        if (target !== result_ul && target !== document.getElementById("project_metadata_keyword_search")) {
                            if (target != null) {
                                if (target.parentElement === result_ul) {
                                    return;
                                }
                            }
                            result_ul.classList.add("hide");
                            window.removeEventListener("click", hide_results);
                            window.removeEventListener("focusin", hide_results);
                        }
                    };
                    window.addEventListener("click", hide_results);
                    window.addEventListener("focusin", hide_results);
                    for (let entry of response.data) {
                        // Get the id without the prefix
                        entry.id = entry.id.replace("https://d-nb.info/gnd/", "");
                        // @ts-ignore
                        result_ul.innerHTML += Handlebars.templates.editor_keyword_gnd_search(entry);
                    }
                    // Add listeners to all li entries
                    // @ts-ignore
                    for (let entry of result_ul.getElementsByTagName("li")) {
                        // @ts-ignore
                        entry.addEventListener("click", function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                let keyword = {};
                                keyword["title"] = this.getAttribute("data-title");
                                keyword["gnd"] = {
                                    "name": "GND",
                                    "value": this.getAttribute("data-gnd"),
                                    "identifier_type": "GND"
                                };
                                try {
                                    Tools.start_loading_spinner();
                                    yield send_add_keyword_request(keyword);
                                    Tools.stop_loading_spinner();
                                    Tools.show_alert("Keyword added.", "success");
                                    let searchbar = document.getElementById("project_metadata_keyword_search");
                                    searchbar.value = "";
                                    result_ul.classList.add("hide");
                                    window.removeEventListener("click", hide_results);
                                    window.removeEventListener("focusin", hide_results);
                                    // @ts-ignore
                                    document.getElementById("project_metadata_keywords").innerHTML += Handlebars.templates.editor_keyword_li(keyword);
                                    //Add remove handler:
                                    // @ts-ignore
                                    for (let button of document.getElementsByClassName("project_metadata_keywords_remove")) {
                                        button.addEventListener("click", remove_keyword_btn_handler);
                                    }
                                }
                                catch (e) {
                                    Tools.stop_loading_spinner();
                                    Tools.show_alert("Failed to add keyword.", "danger");
                                    console.error(e);
                                }
                            });
                        });
                    }
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to search for keyword. Check your network connection", "danger");
                    console.error(e);
                }
            });
        }
        // @ts-ignore
        function remove_keyword_btn_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let target = e.target;
                let div = target.closest(".project_metadata_keywords_entry_wrapper");
                let keyword = div.getAttribute("data-keyword");
                Tools.start_loading_spinner();
                try {
                    yield send_remove_keyword_request(keyword);
                    Tools.stop_loading_spinner();
                    div.remove();
                    Tools.show_alert("Keyword removed.", "success");
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to remove keyword.", "danger");
                    console.error(e);
                }
            });
        }
        function send_remove_keyword_request(keyword) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/keywords/${keyword}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to send remove keyword request`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to remove keyword: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        // @ts-ignore
        function send_add_keyword_request(keyword) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/keywords`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(keyword)
                });
                if (!response.ok) {
                    throw new Error(`Failed to send add keyword request`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to add keyword: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        // @ts-ignore
        function send_gnd_api_search_request(search_term) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/gnd?q=${search_term}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to send search request for persons`);
                }
                else {
                    return yield response.json();
                }
            });
        }
        function add_remove_author_editor_handlers() {
            // Add listeners to all author remove buttons
            // @ts-ignore
            for (let button of document.getElementsByClassName("project_metadata_authors_remove")) {
                button.addEventListener("click", remove_author_btn_handler);
            }
            // Add listeners to all editor remove buttons
            // @ts-ignore
            for (let button of document.getElementsByClassName("project_metadata_editors_remove")) {
                button.addEventListener("click", remove_editor_btn_handler);
            }
        }
        // @ts-ignore
        function remove_author_btn_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let target = e.target;
                let li = target.closest("li");
                let person_id = li.getAttribute("data-id");
                Tools.start_loading_spinner();
                try {
                    yield send_remove_author_request(person_id);
                    Tools.stop_loading_spinner();
                    li.remove();
                }
                catch (e) {
                    Tools.show_alert("Failed to remove author.", "danger");
                }
            });
        }
        // @ts-ignore
        function send_remove_author_request(person_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/authors/${person_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to remove author: ${response_data["error"]}`);
                    }
                    else {
                        return response_data["data"];
                    }
                }
                else {
                    throw new Error(`Failed to get person.`);
                }
            });
        }
        // @ts-ignore
        function remove_editor_btn_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let target = e.target;
                let li = target.closest("li");
                let person_id = li.getAttribute("data-id");
                Tools.start_loading_spinner();
                try {
                    yield send_remove_editor_request(person_id);
                    Tools.stop_loading_spinner();
                    li.remove();
                }
                catch (e) {
                    Tools.show_alert("Failed to remove editor.", "danger");
                }
            });
        }
        // @ts-ignore
        function send_remove_editor_request(person_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/editors/${person_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to remove editor: ${response_data["error"]}`);
                    }
                    else {
                        return response_data["data"];
                    }
                }
                else {
                    throw new Error(`Failed to remove editor.`);
                }
            });
        }
        // @ts-ignore
        function search_person(search_term, result_container, searchbar, select_handler) {
            return __awaiter(this, void 0, void 0, function* () {
                if (search_term === "") {
                    throw new Error("Search term is empty");
                }
                let res = yield send_search_person_request(search_term);
                console.log(res);
                result_container.innerHTML = "";
                result_container.classList.remove("hide");
                let hide_results = function (e) {
                    let target = e.target;
                    if (target !== result_container && target !== searchbar) {
                        if (target != null) {
                            if (target.parentElement === result_container) {
                                return;
                            }
                        }
                        result_container.classList.add("hide");
                        window.removeEventListener("click", hide_results);
                        window.removeEventListener("focusin", hide_results);
                    }
                };
                window.addEventListener("click", hide_results);
                window.addEventListener("focusin", hide_results);
                for (let person of res.data) {
                    // @ts-ignore
                    result_container.innerHTML += Handlebars.templates.editor_add_person_li(person);
                }
                // @ts-ignore
                for (let li of result_container.getElementsByTagName("li")) {
                    li.addEventListener("click", select_handler);
                }
            });
        }
        ProjectOverview.search_person = search_person;
        // @ts-ignore
        function search_authors() {
            return __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                let author_search_select_handler = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let person_id = this.getAttribute("data-id");
                        yield send_add_author_to_project_request(person_id);
                        let person_data = yield send_get_person_request(person_id);
                        // @ts-ignore
                        document.getElementById("project_metadata_authors_ul").innerHTML += Handlebars.templates.editor_add_authors_li(person_data);
                        add_remove_author_editor_handlers();
                    });
                };
                let search_term = document.getElementById("project_metadata_search_authors").value;
                let result_ul = document.getElementById("project_metadata_search_authors_results");
                if (search_term === "") {
                    result_ul.innerHTML = "";
                    return;
                }
                try {
                    yield search_person(search_term, result_ul, document.getElementById("project_metadata_search_authors"), author_search_select_handler);
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
                }
            });
        }
        // @ts-ignore
        function search_editors() {
            return __awaiter(this, void 0, void 0, function* () {
                let search_term = document.getElementById("project_metadata_search_editors").value;
                let result_ul = document.getElementById("project_metadata_search_editors_results");
                let searchbar = document.getElementById("project_metadata_search_editors");
                // @ts-ignore
                let add_person_handler = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let person_id = this.getAttribute("data-id");
                        try {
                            yield send_add_editor_to_project_request(person_id);
                            let person_data = yield send_get_person_request(person_id);
                            // @ts-ignore
                            document.getElementById("project_metadata_editors_ul").innerHTML += Handlebars.templates.editor_add_editors_li(person_data);
                            add_remove_author_editor_handlers();
                        }
                        catch (e) {
                            console.error(e);
                            Tools.show_alert("Failed to add editor.", "danger");
                        }
                    });
                };
                if (search_term === "") {
                    result_ul.innerHTML = "";
                    return;
                }
                try {
                    yield search_person(search_term, result_ul, searchbar, add_person_handler);
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to search for editors. Check your network connection.", "danger");
                }
            });
        }
        function send_search_person_request(search_term) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/persons?query=${search_term}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to send search request for persons`);
                }
                else {
                    return yield response.json();
                }
            });
        }
        // TODO move to avoid export
        function send_get_person_request(person_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/persons/${person_id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to get person: ${response_data["error"]}`);
                    }
                    else {
                        return response_data["data"];
                    }
                }
                else {
                    throw new Error(`Failed to get person.`);
                }
            });
        }
        ProjectOverview.send_get_person_request = send_get_person_request;
        function send_add_author_to_project_request(person_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/authors/${person_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to add person: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
                else {
                    throw new Error(`Failed to add person to project.`);
                }
            });
        }
        function send_add_editor_to_project_request(person_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata/editors/${person_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to add person: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
                else {
                    throw new Error(`Failed to add person to project.`);
                }
            });
        }
        function attach_ddc_handlers() {
            // @ts-ignore
            let handle_change = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    let value = this.options[this.selectedIndex].value;
                    // Hide all sub selects
                    if (this.classList.contains("ddc_first_level")) {
                        Tools.hide_all("ddc_second_level");
                        Tools.hide_all("ddc_third_level");
                    }
                    else if (this.classList.contains("ddc_second_level")) {
                        Tools.hide_all("ddc_third_level");
                    }
                    // Show the sub select
                    let sub_select = document.getElementById("project_metadata_ddc_" + value);
                    if (sub_select) {
                        sub_select.classList.remove("hide");
                        // Show the sub sub select
                        let value2 = sub_select.options[sub_select.selectedIndex].value;
                        let sub_sub_select = document.getElementById("project_metadata_ddc_" + value2);
                        if (sub_sub_select) {
                            sub_sub_select.classList.remove("hide");
                        }
                    }
                    yield update_metadata();
                });
            };
            let selects = document.getElementsByClassName("ddc_select");
            // @ts-ignore
            for (let select of selects) {
                select.addEventListener("change", handle_change);
            }
        }
        function update_settings() {
            return __awaiter(this, void 0, void 0, function* () {
                console.log("Updating settings for project " + globalThis.project_id);
                let data = {};
                data["toc_enabled"] = document.getElementById("project_settings_toc_enabled").checked;
                try {
                    Tools.start_loading_spinner();
                    const response = yield fetch(`/api/projects/${globalThis.project_id}/settings`, {
                        method: 'POST',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    Tools.stop_loading_spinner();
                    if (!response.ok) {
                        throw new Error(`Failed to update project settings ${globalThis.project_id}`);
                    }
                    else {
                        Tools.show_alert("Settings updated.", "success");
                        return response.json();
                    }
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to update settings.", "danger");
                }
            });
        }
        function update_metadata() {
            return __awaiter(this, void 0, void 0, function* () {
                console.log("Updating metadata for project " + globalThis.project_id);
                let data = {};
                data["title"] = document.getElementById("project_metadata_title").value || null;
                data["subtitle"] = document.getElementById("project_metadata_subtitle").value || null;
                data["web_url"] = document.getElementById("project_metadata_web_url").value || null;
                data["published"] = null;
                data["languages"] = null;
                // Check which languages are checked
                let languages = [];
                // @ts-ignore
                for (let checkbox of document.getElementsByClassName("project_metadata_language_checkbox")) {
                    if (checkbox.checked) {
                        languages.push(checkbox.value);
                    }
                }
                if (languages.length > 0) {
                    data["languages"] = languages;
                }
                data["short_abstract"] = document.getElementById("project_metadata_short_abstract").value || null;
                data["long_abstract"] = document.getElementById("project_metadata_long_abstract").value || null;
                data["license"] = null;
                if (document.getElementById("project_metadata_license").value !== "none") {
                    data["license"] = document.getElementById("project_metadata_license").value;
                }
                data["series"] = document.getElementById("project_metadata_series").value || null;
                data["volume"] = document.getElementById("project_metadata_volume").value || null;
                data["edition"] = document.getElementById("project_metadata_edition").value || null;
                data["publisher"] = document.getElementById("project_metadata_publisher").value || null;
                data["ddc"] = null;
                // Get DDC class:
                let main_class = document.getElementById("project_metadata_ddc_main_classes").value;
                if (main_class !== "none") {
                    let second_class = document.getElementById("project_metadata_ddc_" + main_class).value;
                    let third_class = document.getElementById("project_metadata_ddc_" + second_class);
                    if (third_class) {
                        data["ddc"] = third_class.value;
                    }
                    else {
                        data["ddc"] = second_class;
                    }
                }
                console.log("new data: " + JSON.stringify(data));
                try {
                    Tools.start_loading_spinner();
                    const response = yield fetch(`/api/projects/${globalThis.project_id}/metadata`, {
                        method: 'PATCH',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    Tools.stop_loading_spinner();
                    if (!response.ok) {
                        throw new Error(`Failed to update project metadata ${globalThis.project_id}`);
                    }
                    else {
                        Tools.show_alert("Metadata updated.", "success");
                        return response.json();
                    }
                }
                catch (e) {
                    Tools.stop_loading_spinner();
                    Tools.show_alert("Failed to update metadata.", "danger");
                }
            });
        }
        // @ts-ignore
        function load_project_metadata(project_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${project_id}/metadata`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to load project metadata ${project_id}`);
                }
                else {
                    return response.json();
                }
            });
        }
        ProjectOverview.load_project_metadata = load_project_metadata;
        // @ts-ignore
        function load_project_settings(project_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${project_id}/settings`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to load project settings ${project_id}`);
                }
                else {
                    return response.json();
                }
            });
        }
    })(ProjectOverview = Editor.ProjectOverview || (Editor.ProjectOverview = {}));
})(Editor || (Editor = {}));
/// <reference path="Editor-old.ts" />
var Editor;
/// <reference path="Editor-old.ts" />
(function (Editor) {
    let SectionView;
    (function (SectionView) {
        // @ts-ignore
        function show_section_view() {
            return __awaiter(this, void 0, void 0, function* () {
                typing_timer = null;
                pending_content_block_changes = [];
                try {
                    section_data = yield send_get_section(globalThis.section_path);
                    // Retrieve details for authors and editors
                    if (section_data["metadata"]["authors"] != null) {
                        let promises = [];
                        for (let author of section_data["metadata"]["authors"]) {
                            promises.push(Editor.ProjectOverview.send_get_person_request(author));
                        }
                        Tools.start_loading_spinner();
                        try {
                            // @ts-ignore
                            let values = yield Promise.all(promises);
                            Tools.stop_loading_spinner();
                            console.log(values);
                            if (values.length !== section_data["metadata"]["authors"].length) {
                                console.log("Failed to load all authors");
                                Tools.show_alert("Failed to load all authors", "danger");
                            }
                            else {
                                // We need to use a different key for the authors with details, because the key "authors" is used for the ids and used to patch the section
                                section_data["metadata"]["authors_with_details"] = values;
                            }
                        }
                        catch (e) {
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
                            let values = yield Promise.all(promises);
                            Tools.stop_loading_spinner();
                            console.log(values);
                            if (values.length !== section_data["metadata"]["editors"].length) {
                                console.log("Failed to load all editors");
                                Tools.show_alert("Failed to load all editors", "danger");
                            }
                            else {
                                // We need to use a different key for the editors with details, because the key "editors" is used for the ids and used to patch the section
                                section_data["metadata"]["editors_with_details"] = values;
                            }
                        }
                        catch (e) {
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
                    document.getElementById("section_delete_first_stage").addEventListener("click", function () {
                        document.getElementById("section_delete_warning").classList.remove("hide");
                    });
                    document.getElementById("section_delete_cancel").addEventListener("click", function () {
                        document.getElementById("section_delete_warning").classList.add("hide");
                    });
                    document.getElementById("section_delete_confirm").addEventListener("click", delete_section_handler);
                    document.getElementById("section_show_metadata").addEventListener("click", expand_metadata);
                    document.getElementById("section_hide_metadata").addEventListener("click", collapse_metadata);
                    // @ts-ignore
                    for (let button of document.getElementsByClassName("new_block_selection")) {
                        button.addEventListener("click", new_block_selection_handler);
                    }
                    // @ts-ignore
                    window.show_new_editor();
                    // Load content blocks
                    /*let content_blocks = await send_get_content_blocks(globalThis.section_path);
                    console.log(content_blocks);
                    for(let block of content_blocks){
                        // @ts-ignore
                        let html = Handlebars.templates.editor_content_block(ContentBlockParser.contentblock_from_api(block));
                        document.getElementById("section_content_blocks_inner").innerHTML += html;
                        clean_content_block_input(document.getElementById("section_content_blocks_inner").lastChild);
                    }
    
                    add_content_block_handlers();
                     */
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Couldn't load section. Check your network connection.", "danger");
                }
            });
        }
        SectionView.show_section_view = show_section_view;
        function add_content_block_handlers() {
            // Register input change event listeners for all input fields in any content block
            // @ts-ignore
            for (let field of document.getElementsByClassName("content_block_input_trigger")) {
                field.addEventListener("input", content_block_input_handler);
            }
            // Register move up event listeners for all content blocks
            // @ts-ignore
            for (let button of document.getElementsByClassName("content_block_ctls_up")) {
                button.addEventListener("click", content_block_move_up_handler);
            }
            // Register move down event listeners for all content blocks
            // @ts-ignore
            for (let button of document.getElementsByClassName("content_block_ctls_down")) {
                button.addEventListener("click", content_block_move_down_handler);
            }
            // @ts-ignore
            for (let button of document.getElementsByClassName("textelement_edit_bar_btn")) {
                button.addEventListener("click", content_block_edit_bar_handler);
            }
            // @ts-ignore
            for (let button of document.getElementsByClassName("content_block")) {
                button.addEventListener("click", Editor.Sidebar.show_content_block_settings_sidebar);
            }
        }
        // @ts-ignore
        function content_block_edit_bar_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let action = e.target.getAttribute("data-action");
                let selection = window.getSelection();
                let range = selection.getRangeAt(0); // TODO: handle multiple ranges
                console.log("RANGE:");
                console.log(range);
                function checkIfFormatted(node, type) {
                    console.log("Checking if node is formatted: ");
                    console.log(node);
                    // Check if next parent is .inner_content_block
                    if (node.parentNode.classList.contains("inner_content_block")) {
                        // Check if the first child is a span with the class formatted_text_bold
                        if (node.firstChild.nodeName === "SPAN" && node.firstChild.classList.contains("formatted_text_" + type)) {
                            return node.firstChild; // Gibt den gefundenen <span> zurück
                        }
                    }
                    while (node != null && node.nodeName !== "BODY") {
                        if (node.nodeName === "SPAN" && node.classList.contains("formatted_text_" + type)) {
                            return node; // Gibt den gefundenen <span> zurück
                        }
                        node = node.parentNode;
                        console.log("Checking if node is formatted: ");
                        console.log(node);
                    }
                    return null;
                }
                let formattedNode = checkIfFormatted(range.startContainer, action);
                let formattedNodeEnd = checkIfFormatted(range.endContainer, action);
                if (formattedNode || formattedNodeEnd) {
                    // Wenn bereits formatiert, <span> entfernen
                    let parent = formattedNode.parentNode;
                    while (formattedNode.firstChild) {
                        parent.insertBefore(formattedNode.firstChild, formattedNode);
                    }
                    parent.removeChild(formattedNode);
                    yield content_block_input_handler(e.target);
                    return;
                }
                let new_element = document.createElement("span");
                new_element.classList.add("formatted_text");
                new_element.classList.add("formatted_text_" + action);
                range.surroundContents(new_element);
                selection.removeAllRanges();
                console.log(e.target);
                yield content_block_input_handler(e.target);
            });
        }
        // @ts-ignore
        function content_block_move_down_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let block = e.target.closest(".content_block");
                let next = block.nextElementSibling || null;
                if (next === null) { // Do nothing if block is already at the bottom
                    return;
                }
                let block_id = block.getAttribute("data-block-id");
                let after = null;
                if (next === null) {
                    after = null;
                }
                else {
                    after = next.getAttribute("data-block-id");
                }
                try {
                    yield send_move_content_block(globalThis.section_path, block_id, after);
                    next.after(block);
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to move content block.", "danger");
                }
            });
        }
        // @ts-ignore
        function content_block_move_up_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let block = e.target.closest(".content_block");
                let prev_sib = block.previousElementSibling || null;
                if (prev_sib !== null) {
                    prev_sib = prev_sib.previousElementSibling || null; // We need the previous sibling of the previous sibling to get the block to insert after
                }
                let block_id = block.getAttribute("data-block-id");
                let prev = null;
                if (prev_sib === null) {
                    prev = null;
                }
                else {
                    console.log(prev_sib);
                    prev = prev_sib.getAttribute("data-block-id");
                }
                try {
                    yield send_move_content_block(globalThis.section_path, block_id, prev);
                    if (prev_sib !== null) {
                        prev_sib.after(block);
                    }
                    else { // If there is no previous sibling, we need to move the block to the top
                        block.parentElement.insertBefore(block, block.parentElement.firstChild);
                    }
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to move content block.", "danger");
                }
            });
        }
        // @ts-ignore
        function content_block_input_handler(input) {
            return __awaiter(this, void 0, void 0, function* () {
                let changed = null;
                if (input.target) {
                    changed = input.target;
                }
                else {
                    changed = input;
                }
                // Only store the content block in the to upload list if it's not already there
                // @ts-ignore
                if (pending_content_block_changes.includes(changed)) {
                    return;
                }
                pending_content_block_changes.push(changed);
                if (typing_timer) {
                    clearTimeout(typing_timer);
                }
                // Set a timeout to wait for the user to stop typing
                // @ts-ignore
                typing_timer = setTimeout(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield upload_pending_content_block_changes();
                    });
                }, 1000);
            });
        }
        /// Upload all pending content block changes
        // @ts-ignore
        function upload_pending_content_block_changes() {
            return __awaiter(this, void 0, void 0, function* () {
                let requests = [];
                for (let change of pending_content_block_changes) {
                    requests.push(content_block_change_handler(change));
                }
                pending_content_block_changes = [];
                // @ts-ignore
                yield Promise.all(requests);
            });
        }
        function clean_content_block_input(block) {
            let input = block.getElementsByClassName("content_block_input_trigger")[0];
            if (input) {
                input.innerHTML = input.innerHTML.replace("\n", "");
            }
        }
        // @ts-ignore
        function content_block_change_handler(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let block = e.closest(".content_block");
                let json = Editor.ContentBlockParser.parse_contentblock_from_html(block);
                console.log(json);
                try {
                    let res = yield send_update_content_block(globalThis.section_path, json);
                    console.log(res);
                    Tools.show_alert("Successfully updated content block.", "success");
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to update content block.", "danger");
                }
            });
        }
        function send_move_content_block(section_path, block_id, after) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path + "/content_blocks/move", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "insert_after": after,
                        "content_block_id": block_id,
                    })
                });
                if (!response.ok) {
                    throw new Error(`Failed to move content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to move content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        function send_get_content_blocks(section_path) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path + "/content_blocks", {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to get content blocks: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to get content blocks: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function send_add_new_content_block(section_path, block_data) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path + "/content_blocks", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(block_data)
                });
                if (!response.ok) {
                    throw new Error(`Failed to create content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to create content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function send_update_content_block(section_path, block_data) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path + "/content_blocks/" + block_data.id, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(block_data)
                });
                if (!response.ok) {
                    throw new Error(`Failed to update content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to post content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        // @ts-ignore
        function new_block_selection_handler() {
            return __awaiter(this, void 0, void 0, function* () {
                let block_type = this.getAttribute("data-type") || null;
                if (block_type === null) {
                    console.error("No block type specified");
                    return;
                }
                let block = null;
                if (block_type === "paragraph") {
                    block = {
                        content: {
                            Paragraph: {
                                contents: []
                            }
                        },
                        css_classes: null,
                        id: null,
                        revision_id: null
                    };
                }
                else if (block_type === "heading") {
                    block = {
                        content: {
                            Heading: {
                                level: 1,
                                contents: []
                            }
                        },
                        css_classes: null,
                        id: null,
                        revision_id: null
                    };
                }
                else if (block_type === "list") {
                    block = {
                        id: null,
                        revision_id: null,
                        css_classes: null,
                        content: {
                            List: {
                                list_type: "Unordered",
                                items: []
                            }
                        }
                    };
                }
                else if (block_type === "hr") {
                    block = {
                        id: null,
                        revision_id: null,
                        css_classes: null,
                        content: {
                            HorizontalRule: {}
                        }
                    };
                }
                else if (block_type === "custom_html") {
                    block = {
                        id: null,
                        revision_id: null,
                        css_classes: null,
                        content: {
                            CustomHTML: ""
                        }
                    };
                }
                else {
                    Tools.show_alert("Block type not implemented.", "warning");
                    return;
                }
                try {
                    let res = yield send_add_new_content_block(globalThis.section_path, block);
                    console.log(res);
                    // @ts-ignore
                    let html = Handlebars.templates.editor_content_block(Editor.ContentBlockParser.contentblock_from_api(res));
                    document.getElementById("section_content_blocks_inner").innerHTML += html;
                    add_content_block_handlers();
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to add new Block.", "danger");
                }
            });
        }
        let collapse_metadata = function () {
            document.getElementsByClassName("editor_section_view_metadata")[0].classList.add("hide");
            document.getElementsByClassName("editor_section_view_collapsed_metadata")[0].classList.remove("hide");
        };
        let expand_metadata = function () {
            document.getElementsByClassName("editor_section_view_collapsed_metadata")[0].classList.add("hide");
            document.getElementsByClassName("editor_section_view_metadata")[0].classList.remove("hide");
        };
        // @ts-ignore
        let delete_section_handler = function () {
            return __awaiter(this, void 0, void 0, function* () {
                // Hide the warning
                document.getElementById("section_delete_warning").classList.add("hide");
                if (globalThis.section_path.split(":").slice(-1)[0] !== section_data["id"]) {
                    console.error("Section path and section data id don't match. This could lead to deleting the wrong section.");
                    console.log("last section id in path is " + globalThis.section_path.split(":").slice(-1)[0] + " and id is " + section_data["id"]);
                    Tools.show_alert("Failed to delete section.", "danger");
                    return;
                }
                Tools.start_loading_spinner();
                try {
                    yield send_delete_section(globalThis.section_path);
                    Editor.Sidebar.build_sidebar();
                    Editor.ProjectOverview.show_overview();
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to delete section.", "danger");
                }
                Tools.stop_loading_spinner();
            });
        };
        let send_delete_section = function (section_path) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to delete section: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to delete section: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        };
        let add_quickchange_handlers = function () {
            // @ts-ignore
            for (let input of document.getElementsByClassName("quickchange")) {
                input.addEventListener("input", quickchange_handler);
            }
        };
        // @ts-ignore
        let quickchange_handler = function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (typing_timer) {
                    clearTimeout(typing_timer);
                }
                // Set a timeout to wait for the user to stop typing
                // @ts-ignore
                typing_timer = setTimeout(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield metadata_change_handler();
                    });
                }, 1000);
            });
        };
        /// Handle metadata changes, except for authors and editors
        // @ts-ignore
        let metadata_change_handler = function () {
            return __awaiter(this, void 0, void 0, function* () {
                console.log("Metadata change handler");
                // Scrape identifiers from the DOM, since it may have changed
                let identifiers = [];
                // @ts-ignore
                for (let identifier_row of document.getElementsByClassName("section_metadata_identifier_row")) {
                    let identifier_id = identifier_row.getAttribute("data-identifier-id");
                    let identifier_type = identifier_row.getAttribute("data-identifier-type");
                    let identifier_name = identifier_row.getElementsByClassName("section_metadata_identifier_name")[0].value;
                    let identifier_value = identifier_row.getElementsByClassName("section_metadata_identifier_value")[0].value;
                    identifiers.push({
                        "id": identifier_id,
                        "identifier_type": identifier_type,
                        "name": identifier_name,
                        "value": identifier_value
                    });
                }
                let lang = document.getElementById("section_metadata_lang").value;
                if (lang === "none") {
                    lang = null;
                }
                let patch_data = {
                    "metadata": {
                        "title": document.getElementById("section_metadata_title").innerText || null,
                        "subtitle": document.getElementById("section_metadata_subtitle").innerText || null,
                        "identifiers": identifiers,
                        "web_url": document.getElementById("section_metadata_web_url").value || null,
                        "lang": lang,
                    }
                };
                console.log(patch_data);
                Tools.start_loading_spinner();
                try {
                    section_data = yield send_patch_section(globalThis.section_path, patch_data);
                    Tools.show_alert("Successfully updated section metadata.", "success");
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to patch section metadata.", "danger");
                }
                Tools.stop_loading_spinner();
            });
        };
        let add_identifier_remove_handlers = function () {
            // @ts-ignore
            for (let button of document.getElementsByClassName("section_metadata_identifier_remove_btn")) {
                button.addEventListener("click", remove_identifier_handler);
            }
        };
        // @ts-ignore
        function add_identifier() {
            return __awaiter(this, void 0, void 0, function* () {
                let type = document.getElementById("section_metadata_identifiers_type").value || null;
                let name = document.getElementById("section_metadata_identifiers_name").value || null;
                let value = document.getElementById("section_metadata_identifiers_value").value || null;
                if (type === null || name === null || value === null) {
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
                    let resp = yield send_patch_section(globalThis.section_path, patch_data);
                    // Get the new identifier from the response
                    new_identifier = resp["metadata"]["identifiers"][identifiers.length - 1];
                    section_data["metadata"]["identifiers"] = resp["metadata"]["identifiers"];
                    // @ts-ignore
                    document.getElementById("section_metadata_identifiers_list").innerHTML += Handlebars.templates.editor_section_identifier_row(new_identifier);
                    add_identifier_remove_handlers();
                    add_quickchange_handlers();
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to add identifier to section.", "danger");
                    // Remove the identifier from the list again
                    identifiers.splice(identifiers.length - 1, 1);
                }
                Tools.stop_loading_spinner();
            });
        }
        // @ts-ignore
        function remove_identifier_handler() {
            return __awaiter(this, void 0, void 0, function* () {
                let target = this;
                let identifier_row = target.closest(".section_metadata_identifier_row");
                let identifier_id = identifier_row.getAttribute("data-identifier-id");
                let identifiers = section_data["metadata"]["identifiers"];
                // Search identifier with id
                let identifier_index = -1;
                for (let i = 0; i < identifiers.length; i++) {
                    if (identifiers[i]["id"] === identifier_id) {
                        identifier_index = i;
                        break;
                    }
                }
                if (identifier_index === -1) {
                    Tools.show_alert("Failed to remove identifier from section.", "danger");
                    console.log(section_data["metadata"]["identifiers"]);
                    console.log("couldn't find identifier with id " + identifier_id);
                    return;
                }
                identifiers.splice(identifier_index, 1);
                let patch_data = {
                    "metadata": {
                        "identifiers": identifiers,
                    }
                };
                Tools.start_loading_spinner();
                try {
                    yield send_patch_section(globalThis.section_path, patch_data);
                    identifier_row.remove();
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to remove identifier from section.", "danger");
                }
                Tools.stop_loading_spinner();
            });
        }
        // @ts-ignore
        function search_authors() {
            return __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                let author_search_select_handler = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let person_id = this.getAttribute("data-id");
                        let authors = section_data["metadata"]["authors"];
                        //TODO: prevent duplicates
                        if (authors.includes(person_id)) {
                            Tools.show_alert("This author is already added to the section.", "warning");
                            return;
                        }
                        authors.push(person_id);
                        let patch_data = {
                            "metadata": {
                                "authors": authors,
                            }
                        };
                        let send_patch_section_req = send_patch_section(globalThis.section_path, patch_data);
                        let person_data_req = Editor.ProjectOverview.send_get_person_request(person_id);
                        try {
                            // @ts-ignore
                            let res = yield Promise.all([send_patch_section_req, person_data_req]);
                            console.log("Person data:");
                            console.log(res[1]);
                            // @ts-ignore
                            document.getElementById("section_metadata_authors_ul").innerHTML += Handlebars.templates.editor_section_authors_li(res[1]);
                        }
                        catch (e) {
                            console.error(e);
                            Tools.show_alert("Failed to add author to section.", "danger");
                            // Remove the author from the list again
                            authors.splice(authors.indexOf(person_id), 1);
                            //TODO: check what caused the error, remove invalid authors from the list, if that caused the error (case: author was deleted but not removed from the section)
                        }
                        add_author_remove_handlers();
                    });
                };
                let search_term = document.getElementById("section_metadata_search_authors").value;
                let result_ul = document.getElementById("section_metadata_search_authors_results");
                if (search_term === "") {
                    result_ul.innerHTML = "";
                    return;
                }
                try {
                    yield Editor.ProjectOverview.search_person(search_term, result_ul, document.getElementById("section_metadata_search_authors"), author_search_select_handler);
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
                }
            });
        }
        // @ts-ignore
        function search_editors() {
            return __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                let editor_search_select_handler = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let person_id = this.getAttribute("data-id");
                        let editors = section_data["metadata"]["editors"];
                        //TODO: prevent duplicates
                        if (editors.includes(person_id)) {
                            Tools.show_alert("This editor is already added to the section.", "warning");
                            return;
                        }
                        editors.push(person_id);
                        let patch_data = {
                            "metadata": {
                                "editors": editors,
                            }
                        };
                        let send_patch_section_req = send_patch_section(globalThis.section_path, patch_data);
                        let person_data_req = Editor.ProjectOverview.send_get_person_request(person_id);
                        try {
                            // @ts-ignore
                            let res = yield Promise.all([send_patch_section_req, person_data_req]);
                            console.log("Person data:");
                            console.log(res[1]);
                            // @ts-ignore
                            document.getElementById("section_metadata_editors_ul").innerHTML += Handlebars.templates.editor_section_editors_li(res[1]);
                        }
                        catch (e) {
                            console.error(e);
                            Tools.show_alert("Failed to add editor to section.", "danger");
                            // Remove the editor from the list again
                            editors.splice(editors.indexOf(person_id), 1);
                            //TODO: check what caused the error, remove invalid editors from the list, if that caused the error (case: editor was deleted but not removed from the section)
                        }
                        add_editor_remove_handlers();
                    });
                };
                let search_term = document.getElementById("section_metadata_search_editors").value;
                let result_ul = document.getElementById("section_metadata_search_editors_results");
                if (search_term === "") {
                    result_ul.innerHTML = "";
                    return;
                }
                try {
                    yield Editor.ProjectOverview.search_person(search_term, result_ul, document.getElementById("section_metadata_search_editors"), editor_search_select_handler);
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to search for editors. Check your network connection.", "danger");
                }
            });
        }
        function add_author_remove_handlers() {
            // @ts-ignore
            let handler = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    let author_id = this.parentElement.getAttribute("data-id");
                    let authors = section_data["metadata"]["authors"];
                    authors.splice(authors.indexOf(author_id), 1);
                    let patch_data = {
                        "metadata": {
                            "authors": authors,
                        }
                    };
                    Tools.start_loading_spinner();
                    try {
                        yield send_patch_section(globalThis.section_path, patch_data);
                        document.getElementById("section_metadata_authors_li_" + author_id).remove();
                    }
                    catch (e) {
                        console.error(e);
                        Tools.show_alert("Failed to remove author from section.", "danger");
                        // Add the author to the list again
                        authors.push(author_id);
                    }
                    Tools.stop_loading_spinner();
                });
            };
            // @ts-ignore
            for (let button of document.getElementsByClassName("section_metadata_authors_remove")) {
                button.addEventListener("click", handler);
            }
        }
        function add_editor_remove_handlers() {
            // @ts-ignore
            let handler = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    let editor_id = this.parentElement.getAttribute("data-id");
                    let editors = section_data["metadata"]["editors"];
                    editors.splice(editors.indexOf(editor_id), 1);
                    let patch_data = {
                        "metadata": {
                            "editors": editors,
                        }
                    };
                    Tools.start_loading_spinner();
                    try {
                        yield send_patch_section(globalThis.section_path, patch_data);
                        document.getElementById("section_metadata_editors_li_" + editor_id).remove();
                    }
                    catch (e) {
                        console.error(e);
                        Tools.show_alert("Failed to remove editor from section.", "danger");
                        // Add the editor to the list again
                        editors.push(editor_id);
                    }
                    Tools.stop_loading_spinner();
                });
            };
            // @ts-ignore
            for (let button of document.getElementsByClassName("section_metadata_editors_remove")) {
                button.addEventListener("click", handler);
            }
        }
        function send_get_section(section_path) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to get section data: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to get section data: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function send_patch_section(section_path, section_data) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/` + section_path, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(section_data)
                });
                if (!response.ok) {
                    throw new Error(`Failed to patch section data: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to patch section data: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
    })(SectionView = Editor.SectionView || (Editor.SectionView = {}));
})(Editor || (Editor = {}));
var Editor;
(function (Editor) {
    let ContentBlockParser;
    (function (ContentBlockParser) {
        let NoteType;
        (function (NoteType) {
            NoteType["Footnote"] = "Footnote";
            NoteType["Endnote"] = "Endnote";
        })(NoteType || (NoteType = {}));
        function add_extra_fields_for_list(block) {
            if (block.list_type === "Unordered") {
                block.list_type_extra = { Unordered: true };
            }
            else if (block.list_type === "Ordered") {
                block.list_type_extra = { Ordered: true };
            }
            let items = [];
            for (let item of block.items) {
                for (let content of item.contents) {
                    if (content.TextElement) {
                        content.TextElement = add_extra_fields(content.TextElement);
                    }
                    else if (content.List) {
                        content.List = add_extra_fields_for_list(content.List);
                    }
                }
            }
            return block;
        }
        function add_extra_fields(block) {
            if (block.String) {
                return block;
            }
            if (block.FormattedText) {
                let format = block.FormattedText.format;
                let format_extra = block.FormattedText.format_extra;
                if (!format_extra) {
                    if (format === "Bold") {
                        format_extra = { Bold: true };
                    }
                    else if (format === "Italic") {
                        format_extra = { Italic: true };
                    }
                    else if (format === "Underline") {
                        format_extra = { Underline: true };
                    }
                    else if (format === "Strikethrough") {
                        format_extra = { Strikethrough: true };
                    }
                    else if (format === "Superscript") {
                        format_extra = { Superscript: true };
                    }
                    else if (format === "Subscript") {
                        format_extra = { Subscript: true };
                    }
                    else if (format === "None") {
                        format_extra = { None: true };
                    }
                }
                let contents = [];
                for (let content of block.FormattedText.contents) {
                    contents.push(add_extra_fields(content));
                }
                return { FormattedText: { contents: contents, format: format, format_extra: format_extra } };
            }
            if (block.Link) {
                let text = block.Link.text;
                if (text) {
                    let contents = text.map(add_extra_fields);
                    return { Link: { url: block.Link.url, text: contents } };
                }
                else {
                    return { Link: { url: block.Link.url, text: null } };
                }
            }
            if (block.Note) {
                let contents = block.Note.content.map(add_extra_fields);
                let note_type = block.Note.note_type;
                let note_type_extra = block.Note.note_type_extra;
                if (!note_type_extra) {
                    if (note_type === "Footnote") {
                        note_type_extra = NoteType.Footnote;
                    }
                    else if (note_type === "Endnote") {
                        note_type_extra = NoteType.Endnote;
                    }
                }
                return { Note: { note_type: block.Note.note_type, note_type_extra: note_type_extra, content: contents } };
            }
            return block;
        }
        function contentblock_from_api(data) {
            let content;
            if (data.content.Paragraph) {
                let contents = [];
                for (let paragraph of data.content.Paragraph.contents) {
                    contents.push(add_extra_fields(paragraph));
                }
                content = { Paragraph: { contents: contents } };
            }
            else if (data.content.Heading) {
                let contents = [];
                for (let heading of data.content.Heading.contents) {
                    contents.push(add_extra_fields(heading));
                }
                content = { Heading: { level: data.content.Heading.level, contents: contents } };
            }
            else if (data.content.List) {
                content = { List: add_extra_fields_for_list(data.content.List) };
            }
            else if (data.content.HorizontalRule) {
                content = { HorizontalRule: {} };
            }
            else if (data.content.hasOwnProperty("CustomHTML")) {
                if (data.content.CustomHTML === "") {
                    content = { CustomHTML: " " };
                }
                else {
                    content = { CustomHTML: data.content.CustomHTML.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;").replace("\n", "<br>") };
                }
            }
            else {
                console.error("Unknown content type: ", data.content);
                throw new Error("Unknown content type: " + data.content);
            }
            let res = {
                id: data.id,
                revision_id: data.revision_id,
                content: content,
                css_classes: data.css_class
            };
            //TODO: Add extra fields for other types
            return res;
        }
        ContentBlockParser.contentblock_from_api = contentblock_from_api;
        function parse_contentblock_from_html(block) {
            //TODO: Clean up unnecessary splits into multiple text elements (e.g. after formatting got removed)
            let res = {
                content: undefined,
                css_classes: null,
                id: block.getAttribute("data-block-id") || null,
                revision_id: null
            };
            let type = block.getAttribute("data-block-type");
            if (type === "paragraph") {
                let p_tag = block.querySelector("p");
                if (p_tag === null) {
                    throw new Error("Paragraph block does not contain a p tag");
                }
                let inner_content = p_tag.childNodes;
                let paragraph_contents = [];
                // @ts-ignore
                for (let node of inner_content) {
                    paragraph_contents = paragraph_contents.concat(parse_node(node));
                }
                // Remove last line break
                if (paragraph_contents.length > 0 && paragraph_contents[paragraph_contents.length - 1].LineBreak) {
                    paragraph_contents.pop();
                }
                res.content = { Paragraph: { contents: paragraph_contents } };
                return res;
            }
            else if (type === "heading") {
                let input = block.getElementsByClassName("content_block_heading_input")[0];
                if (input === null) {
                    throw new Error("Heading block does not contain a heading input");
                }
                let level = parseInt(input.getAttribute("data-level"));
                let inner_content = input.childNodes;
                let heading_text_contents = [];
                // @ts-ignore
                for (let node of inner_content) {
                    heading_text_contents = heading_text_contents.concat(parse_node(node));
                }
                // Remove last line break
                if (heading_text_contents.length > 0 && heading_text_contents[heading_text_contents.length - 1].LineBreak) {
                    heading_text_contents.pop();
                }
                res.content = { Heading: { level: level, contents: heading_text_contents } };
                return res;
            }
            else if (type === "list") {
                let input = block.getElementsByClassName("content_block_list_input")[0];
                if (input === null) {
                    throw new Error("Heading block does not contain a list input");
                }
                let list_type = input.getAttribute("data-type");
                let list_entries = [];
                // @ts-ignore
                for (let item of input.getElementsByTagName("li")) {
                    let list_entry = parse_list_entry(item);
                    // Only add list entry if it contains content
                    if (list_entry.contents.length > 0) {
                        // Only add list entry if it isn't just a single line break
                        if (!(list_entry.contents.length === 1 && list_entry.contents[0].TextElement.LineBreak)) {
                            list_entries.push(parse_list_entry(item));
                        }
                    }
                }
                res.content = { List: { items: list_entries, list_type: list_type } };
                return res;
            }
            else if (type === "custom_html") {
                let custom_html = block.getElementsByClassName("content_block_custom_html_input")[0];
                if (custom_html === null) {
                    throw new Error("Custom HTML block does not contain a custom html input");
                }
                let content = new DOMParser().parseFromString(custom_html.innerHTML.replace("<br>", "\n"), "text/html").documentElement.textContent;
                res.content = { CustomHTML: content };
                return res;
            }
            else {
                console.error("Unknown block type to parse: ", type);
                throw new Error("Unknown block type to parse: " + type);
            }
        }
        ContentBlockParser.parse_contentblock_from_html = parse_contentblock_from_html;
        function parse_list_entry(entry) {
            let children = entry.childNodes;
            let list_entry = { contents: [] };
            // @ts-ignore
            for (let node of children) {
                // Check if node is another ul or ol
                if (node.nodeType === Node.ELEMENT_NODE) {
                    let el = node;
                    //Check if entry is a list -> parse recursively
                    if (el.tagName === 'UL') {
                        let new_list = { items: [], list_type: "Unordered" };
                        // @ts-ignore
                        for (let item of el.getElementsByTagName("li")) {
                            new_list.items.push(parse_list_entry(item));
                        }
                        list_entry.contents.push({ List: new_list });
                        continue;
                    }
                    else if (el.tagName === 'OL') {
                        let new_list = { items: [], list_type: "Ordered" };
                        // @ts-ignore
                        for (let item of el.getElementsByTagName("li")) {
                            new_list.items.push(parse_list_entry(item));
                        }
                        list_entry.contents.push({ List: new_list });
                        continue;
                    }
                }
                // If node is not a list, parse it as a text element and add it to the list entry
                let entry_content = parse_node(node);
                for (let content of entry_content) {
                    list_entry.contents.push({ TextElement: content });
                }
            }
            return list_entry;
        }
        function parse_node(node) {
            console.log("Parsing node: ");
            console.log(node);
            let res = [];
            // Simple Text
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent.replace('​', "").replace("\n", "").replace(/ {2,}/g, ' ');
                /*if(text.length > 0){
                    res.push({String: text+" "});
                }*/
                if (text.length > 0) {
                    res.push({ String: text });
                }
            }
            // Formatted Text, Link, Note
            if (node.nodeType === Node.ELEMENT_NODE) {
                let el = node;
                // Line Break
                if (el.tagName === "BR") {
                    res.push({ LineBreak: {} });
                }
                // Formatted Text
                if (el.classList.contains("formatted_text")) {
                    let format_extra = {};
                    let format = "";
                    if (el.classList.contains("formatted_text_bold")) {
                        format_extra.Bold = true;
                        format = "Bold";
                    }
                    else if (el.classList.contains("formatted_text_italic")) {
                        format_extra.Italic = true;
                        format = "Italic";
                    }
                    else if (el.classList.contains("formatted_text_underline")) {
                        format_extra.Underline = true;
                        format = "Underline";
                    }
                    else if (el.classList.contains("formatted_text_strikethrough")) {
                        format_extra.Strikethrough = true;
                        format = "Strikethrough";
                    }
                    else if (el.classList.contains("formatted_text_superscript")) {
                        format_extra.Superscript = true;
                        format = "Superscript";
                    }
                    else if (el.classList.contains("formatted_text_subscript")) {
                        format_extra.Subscript = true;
                        format = "Subscript";
                    }
                    else if (el.classList.contains("formatted_text_none")) {
                        format_extra.None = true;
                        format = "None";
                    }
                    else {
                        console.error("Unknown formatted text class: ", el.classList);
                        throw new Error("Unknown formatted text class: " + el.classList);
                    }
                    let contents = [];
                    // @ts-ignore
                    for (let child of el.childNodes) {
                        contents = contents.concat(parse_node(child));
                        // TODO: merge consecutive strings
                    } //TODO: check if we really need format_extra
                    res.push({ FormattedText: { contents: contents, format: format, format_extra: format_extra } });
                }
                // Link
                if (el.classList.contains("link")) {
                    let link = el;
                    res.push({ Link: { url: link.href, text: parse_node(link) } }); //TODO set text to null if it is empty
                }
                //TODO: implement notes
            }
            return res;
        }
    })(ContentBlockParser = Editor.ContentBlockParser || (Editor.ContentBlockParser = {}));
})(Editor || (Editor = {}));
var Tools;
(function (Tools) {
    function hide_all(class_name) {
        // @ts-ignore
        for (let element of document.getElementsByClassName(class_name)) {
            element.classList.add("hide");
        }
    }
    Tools.hide_all = hide_all;
    function start_loading_spinner() {
        let loading_spinner = document.getElementById("loading_spinner");
        if (loading_spinner !== null) {
            loading_spinner.style.display = "block";
        }
    }
    Tools.start_loading_spinner = start_loading_spinner;
    function stop_loading_spinner() {
        let loading_spinner = document.getElementById("loading_spinner");
        if (loading_spinner !== null) {
            loading_spinner.style.display = "none";
        }
    }
    Tools.stop_loading_spinner = stop_loading_spinner;
    function show_alert(message, type = "danger|warning|success|info|primary|secondary|light|dark") {
        let id = Math.floor(Math.random() * 100000000);
        // @ts-ignore
        let alert_html = Handlebars.templates.alert_tmpl({ "message": message, "type": type, "id": id });
        //Insert alert as first element of body
        document.body.insertAdjacentHTML("afterbegin", alert_html);
        let alert = document.getElementById("alert_" + id);
        alert.getElementsByClassName("alert-close")[0].addEventListener("click", function () {
            alert.remove();
        });
        setTimeout(() => {
            if (alert !== null) {
                alert.remove();
            }
        }, 5000);
    }
    Tools.show_alert = show_alert;
})(Tools || (Tools = {}));
/// <reference path="ProjectOverview.ts" />
/// <reference path="SectionView.ts" />
/// <reference path="./ContentBlockParser.ts" />
/// <reference path="Sidebar.ts" />
/// <reference path="./General.ts" />
var Editor;
/// <reference path="ProjectOverview.ts" />
/// <reference path="SectionView.ts" />
/// <reference path="./ContentBlockParser.ts" />
/// <reference path="Sidebar.ts" />
/// <reference path="./General.ts" />
(function (Editor) {
    // @ts-ignore
    function init() {
        return __awaiter(this, void 0, void 0, function* () {
            let project_id = extract_project_id_from_url();
            globalThis.project_id = project_id;
            Editor.ProjectOverview.show_overview();
        });
    }
    Editor.init = init;
    function extract_project_id_from_url() {
        let url = new URL(window.location.href);
        return url.pathname.split("/")[2];
    }
})(Editor || (Editor = {}));
// @ts-ignore
window.addEventListener("load", function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield Editor.init();
    });
});
/// <reference path="Editor-old.ts" />
var Editor;
/// <reference path="Editor-old.ts" />
(function (Editor) {
    let Sidebar;
    (function (Sidebar) {
        var current_content_block_settings_shown = null;
        // @ts-ignore
        function build_sidebar() {
            return __awaiter(this, void 0, void 0, function* () {
                current_content_block_settings_shown = null;
                let data = {};
                let get_content_promise = send_get_contents();
                let get_metadata_promise = Editor.ProjectOverview.load_project_metadata(globalThis.project_id);
                try {
                    // @ts-ignore
                    let res = yield Promise.all([get_content_promise, get_metadata_promise]);
                    data["contents"] = res[0]["data"];
                    data["metadata"] = res[1]["data"];
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to load sidebar", "danger");
                    return;
                }
                let sidebar = document.getElementById("editor-sidebar");
                console.log(data);
                // @ts-ignore
                sidebar.innerHTML = Handlebars.templates.editor_sidebar(data);
                let add_content_button = document.getElementById("editor_sidebar_add_section");
                add_content_button.addEventListener("click", add_section_btn_lstnr);
                add_dropzones();
                add_draggables();
                add_toc_listeners();
                // @ts-ignore
                window.add_import_listeners();
                document.getElementById("editor_sidebar_project_title").addEventListener("click", Editor.ProjectOverview.show_overview);
            });
        }
        Sidebar.build_sidebar = build_sidebar;
        // @ts-ignore
        function show_content_block_settings_sidebar(caller) {
            return __awaiter(this, void 0, void 0, function* () {
                let content_block = caller.target.closest(".content_block");
                let id = content_block.getAttribute("data-block-id");
                if (current_content_block_settings_shown !== id) {
                    current_content_block_settings_shown = id;
                }
                else { // We already have the settings for this content block shown, so we do nothing
                    return;
                }
                let data = yield send_get_content_block(globalThis.section_path, id);
                if (data.content.hasOwnProperty("Heading")) {
                    let level = data.content["Heading"]["level"];
                    data.content["Heading"]["level_extra"] = {};
                    data.content["Heading"]["level_extra"]["level" + level] = true;
                }
                let sidebar = document.getElementById("editor-sidebar");
                // @ts-ignore
                sidebar.innerHTML = Handlebars.templates.editor_sidebar_content_block_settings(data);
                // Add back listener:
                document.getElementById("editor_sidebar_content_block_settings_back").addEventListener("click", build_sidebar);
                // @ts-ignore
                document.getElementById("editor_sidebar_content_block_settings_delete").addEventListener("click", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            yield send_delete_content_block(globalThis.section_path, id);
                            // Remove content block from section view
                            content_block.remove();
                            yield build_sidebar();
                        }
                        catch (e) {
                            console.error(e);
                            Tools.show_alert("Failed to delete content block", "danger");
                        }
                    });
                });
                // Add update listeners:
                if (data.content.hasOwnProperty("Heading")) {
                    // @ts-ignore
                    document.getElementById("editor_sidebar_content_block_settings_heading_level_select").addEventListener("change", function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            let new_level = parseInt(document.getElementById("editor_sidebar_content_block_settings_heading_level_select").value);
                            console.log(new_level);
                            try {
                                let block = {
                                    content: {
                                        Heading: {
                                            level: new_level,
                                        }
                                    }
                                };
                                yield patch_content_block(globalThis.section_path, id, block);
                                // Change level of heading in section view
                                let input = content_block.getElementsByClassName("content_block_heading_input")[0];
                                input.outerHTML = input.outerHTML.replace(/<h[1-6]/, "<h" + new_level);
                                input.setAttribute("data-level", new_level.toString());
                                Tools.show_alert("Updated content block", "success");
                            }
                            catch (e) {
                                console.error(e);
                                Tools.show_alert("Failed to update content block", "danger");
                            }
                        });
                    });
                }
            });
        }
        Sidebar.show_content_block_settings_sidebar = show_content_block_settings_sidebar;
        function patch_content_block(section_path, block_id, patch_data) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(patch_data)
                });
                if (!response.ok) {
                    throw new Error(`Failed to patch content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to patch content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function send_get_content_block(section_path, block_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to get content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to get content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function send_delete_content_block(section_path, block_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/sections/${section_path}/content_blocks/${block_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to delete content block: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to delete content block: ${response_data["error"]}`);
                    }
                    else {
                        return response_data.data;
                    }
                }
            });
        }
        function add_toc_listeners() {
            // @ts-ignore
            for (let toc_item of document.getElementsByClassName("editor_sidebar_contents_section")) {
                toc_item.addEventListener("click", toc_click_listener);
            }
        }
        // @ts-ignore
        function toc_click_listener(e) {
            return __awaiter(this, void 0, void 0, function* () {
                let target = e.target;
                if (!target.classList.contains("editor_sidebar_contents_section_wrapper")) {
                    target = target.closest(".editor_sidebar_contents_section_wrapper");
                }
                let section_id = target.getAttribute("data-section-id") || null;
                if (section_id === null) {
                    console.error("Section has no id");
                    return;
                }
                // Get path of section
                let path = section_id;
                // Append parents to path, until we reach the root
                while (target.parentElement.closest(".editor_sidebar_contents_section_wrapper") !== null) {
                    let parent_section_id = target.parentElement.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id") || null;
                    if (parent_section_id === null) {
                        console.error("Parent section has no id");
                        return;
                    }
                    // Append parent section id to path
                    path = parent_section_id + ":" + path;
                    // Go up one level
                    target = target.parentElement.closest(".editor_sidebar_contents_section_wrapper");
                }
                globalThis.section_id = section_id;
                globalThis.section_path = path;
                yield Editor.SectionView.show_section_view();
            });
        }
        function add_draggables() {
            let dragstart = function (ev) {
                console.log(ev.target.id);
                ev.dataTransfer.setData("text", ev.target.id);
            };
            // @ts-ignore
            for (let draggable of document.getElementsByClassName("editor_sidebar_contents_section_wrapper")) {
                draggable.addEventListener("dragstart", dragstart);
            }
        }
        function add_dropzones() {
            let dragover = function (ev) {
                ev.preventDefault();
            };
            let dragenter = function (ev) {
                if (ev.target.classList.contains("editor_sidebar_contents_section_after_dropzone")) {
                    ev.target.classList.add("active-border-bottom");
                }
            };
            let dragleave = function (ev) {
                if (ev.target.classList.contains("editor_sidebar_contents_section_after_dropzone")) {
                    ev.target.classList.remove("active-border-bottom");
                }
            };
            // @ts-ignore
            let drop_after = function (ev) {
                return __awaiter(this, void 0, void 0, function* () {
                    ev.preventDefault();
                    ev.target.classList.remove("active-border-bottom");
                    let data = ev.dataTransfer.getData("text");
                    console.log("Moving element " + data + " after element" + ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                    let section_id = document.getElementById(data).getAttribute("data-section-id");
                    try {
                        yield send_move_section_after(section_id, ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                        ev.target.closest(".editor_sidebar_contents_section_wrapper").getElementsByClassName("editor_sidebar_contents_section_children")[0].appendChild(document.getElementById(data));
                    }
                    catch (e) {
                        console.error(e);
                        Tools.show_alert("Failed to move section", "danger");
                    }
                    ev.target.closest(".editor_sidebar_contents_section_wrapper").after(document.getElementById(data));
                });
            };
            // @ts-ignore
            let drop_on = function (ev) {
                return __awaiter(this, void 0, void 0, function* () {
                    ev.preventDefault();
                    ev.target.classList.remove("active-border-bottom");
                    let data = ev.dataTransfer.getData("text");
                    console.log("Moving element " + data + " ON element" + ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                    let section_id = document.getElementById(data).getAttribute("data-section-id");
                    try {
                        yield send_move_section_to_child(section_id, ev.target.closest(".editor_sidebar_contents_section_wrapper").getAttribute("data-section-id"));
                        ev.target.closest(".editor_sidebar_contents_section_wrapper").getElementsByClassName("editor_sidebar_contents_section_children")[0].appendChild(document.getElementById(data));
                    }
                    catch (e) {
                        console.error(e);
                        Tools.show_alert("Failed to move section", "danger");
                    }
                });
            };
            // Add after section dropzones
            // @ts-ignore
            for (let dropzone of document.getElementsByClassName("editor_sidebar_contents_section_after_dropzone")) {
                dropzone.addEventListener("dragover", dragover);
                dropzone.addEventListener("drop", drop_after);
                dropzone.addEventListener("dragenter", dragenter);
                dropzone.addEventListener("dragleave", dragleave);
            }
            // Add make to children (drop on element) dropzones
            // @ts-ignore
            for (let dropzone of document.getElementsByClassName("editor_sidebar_contents_section")) {
                dropzone.addEventListener("dragover", dragover);
                dropzone.addEventListener("drop", drop_on);
            }
        }
        // @ts-ignore
        function add_section_btn_lstnr() {
            return __awaiter(this, void 0, void 0, function* () {
                let title = document.getElementById("editor_sidebar_section_name").value || null;
                if (title === null) {
                    Tools.show_alert("Please enter a title", "danger");
                    return;
                }
                let data = {
                    "Section": {
                        "children": [],
                        "sub_sections": [],
                        "visible_in_toc": true,
                        "css_classes": [],
                        "metadata": {
                            "title": title,
                            "authors": [],
                            "editors": [],
                            "identifiers": [],
                        }
                    }
                };
                try {
                    let section = yield send_add_section(data);
                    yield build_sidebar();
                }
                catch (e) {
                    console.error(e);
                    Tools.show_alert("Failed to add section", "danger");
                }
            });
        }
        function send_move_section_after(section_id, after_section_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/contents/${section_id}/move/after/${after_section_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to move section: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to move section: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        function send_move_section_to_child(section_id, parent_id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/contents/${section_id}/move/child_of/${parent_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to move section: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to move section: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        function send_add_section(data) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/contents/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    throw new Error(`Failed to add section: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to add section: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
        function send_get_contents() {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/projects/${globalThis.project_id}/contents/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to get contents: ${response.status}`);
                }
                else {
                    let response_data = yield response.json();
                    if (response_data.hasOwnProperty("error")) {
                        throw new Error(`Failed to get contents: ${response_data["error"]}`);
                    }
                    else {
                        return response_data;
                    }
                }
            });
        }
    })(Sidebar = Editor.Sidebar || (Editor.Sidebar = {}));
})(Editor || (Editor = {}));
