var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/// <reference path="Editor.ts" />
var Editor;
/// <reference path="Editor.ts" />
(function (Editor) {
    let ProjectOverview;
    (function (ProjectOverview) {
        function show_overview() {
            console.log("Loading overview for project " + globalThis.project_id);
            let project_data = load_project_metadata(globalThis.project_id);
            let project_settings = load_project_settings(globalThis.project_id);
            Tools.start_loading_spinner();
            // @ts-ignore
            Promise.all([project_data, project_settings]).then(function (values) {
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
        function search_authors() {
            let search_term = document.getElementById("project_metadata_search_authors").value;
            let result_ul = document.getElementById("project_metadata_search_authors_results");
            if (search_term === "") {
                result_ul.innerHTML = "";
                return;
            }
            send_search_person_request(search_term).then(function (data) {
                console.log(data.data);
                result_ul.innerHTML = "";
                result_ul.classList.remove("hide");
                let hide_results = function (e) {
                    let target = e.target;
                    if (target !== result_ul && target !== document.getElementById("project_metadata_search_authors")) {
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
                for (let person of data.data) {
                    // @ts-ignore
                    result_ul.innerHTML += Handlebars.templates.editor_add_person_li(person);
                }
                // @ts-ignore
                let add_person_handler = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let person_id = this.getAttribute("data-id");
                        try {
                            yield send_add_author_to_project_request(person_id);
                            let person_data = yield send_get_person_request(person_id);
                            // @ts-ignore
                            document.getElementById("project_metadata_authors_ul").innerHTML += Handlebars.templates.editor_add_authors_li(person_data);
                            add_remove_author_editor_handlers();
                        }
                        catch (e) {
                            Tools.show_alert("Failed to add author.", "danger");
                        }
                    });
                };
                // @ts-ignore
                for (let li of result_ul.getElementsByTagName("li")) {
                    li.addEventListener("click", add_person_handler);
                }
            }).catch(function () {
                Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
            });
        }
        function search_editors() {
            let search_term = document.getElementById("project_metadata_search_editors").value;
            let result_ul = document.getElementById("project_metadata_search_editors_results");
            if (search_term === "") {
                result_ul.innerHTML = "";
                return;
            }
            send_search_person_request(search_term).then(function (data) {
                console.log(data.data);
                result_ul.innerHTML = "";
                result_ul.classList.remove("hide");
                let hide_results = function (e) {
                    let target = e.target;
                    if (target !== result_ul && target !== document.getElementById("project_metadata_search_editors")) {
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
                for (let person of data.data) {
                    // @ts-ignore
                    result_ul.innerHTML += Handlebars.templates.editor_add_person_li(person);
                }
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
                            Tools.show_alert("Failed to add editor.", "danger");
                        }
                    });
                };
                // @ts-ignore
                for (let li of result_ul.getElementsByTagName("li")) {
                    li.addEventListener("click", add_person_handler);
                }
            }).catch(function () {
                Tools.show_alert("Failed to search for authors. Check your network connection.", "danger");
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
/// <reference path="Editor.ts" />
var Editor;
/// <reference path="Editor.ts" />
(function (Editor) {
    let SectionView;
    (function (SectionView) {
        function show_section_view() {
            alert("Loading section: " + globalThis.section_id);
        }
        SectionView.show_section_view = show_section_view;
    })(SectionView = Editor.SectionView || (Editor.SectionView = {}));
})(Editor || (Editor = {}));
/// <reference path="Editor.ts" />
var Editor;
/// <reference path="Editor.ts" />
(function (Editor) {
    let Sidebar;
    (function (Sidebar) {
        // @ts-ignore
        function build_sidebar() {
            return __awaiter(this, void 0, void 0, function* () {
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
            });
        }
        Sidebar.build_sidebar = build_sidebar;
        function add_toc_listeners() {
            // @ts-ignore
            for (let toc_item of document.getElementsByClassName("editor_sidebar_contents_section")) {
                toc_item.addEventListener("click", toc_click_listener);
            }
        }
        function toc_click_listener(e) {
            let target = e.target;
            if (!target.classList.contains("editor_sidebar_contents_section_wrapper")) {
                target = target.closest(".editor_sidebar_contents_section_wrapper");
            }
            let section_id = target.getAttribute("data-section-id") || null;
            if (section_id === null) {
                console.error("Section id is null");
                return;
            }
            globalThis.section_id = section_id;
            Editor.SectionView.show_section_view();
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
                //TODO: Add section to sidebar visually
                let title = document.getElementById("editor_sidebar_section_name").value || null;
                if (title === null) {
                    Tools.show_alert("Please enter a title", "danger");
                    return;
                }
                let data = {
                    "Section": {
                        "children": [],
                        "visible_in_toc": true,
                        "metadata": {
                            "title": title,
                        }
                    }
                };
                try {
                    let section = yield send_add_section(data);
                    add_dropzones();
                    add_draggables();
                    add_toc_listeners();
                    console.log(section);
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
/// <reference path="Sidebar.ts" />
/// <reference path="General.ts" />
var Editor;
/// <reference path="ProjectOverview.ts" />
/// <reference path="SectionView.ts" />
/// <reference path="Sidebar.ts" />
/// <reference path="General.ts" />
(function (Editor) {
    // @ts-ignore
    function init() {
        return __awaiter(this, void 0, void 0, function* () {
            let project_id = extract_project_id_from_url();
            globalThis.project_id = project_id;
            Editor.ProjectOverview.show_overview();
            yield Editor.Sidebar.build_sidebar();
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
