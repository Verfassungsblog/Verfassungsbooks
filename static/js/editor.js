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
        function show_overview(project_data) {
            // @ts-ignore
            let details = Handlebars.templates.editor_main_project_overview(project_data);
            document.getElementsByClassName("editor-details")[0].innerHTML = details;
            console.log(project_data);
            attach_ddc_handlers();
            document.getElementById("project_settings_toc_enabled").addEventListener("change", update_settings);
        }
        ProjectOverview.show_overview = show_overview;
        function attach_ddc_handlers() {
            let handle_change = function () {
                let value = parseInt(this.options[this.selectedIndex].value);
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
                }
                console.log(value);
            };
            let selects = document.getElementsByClassName("ddc_select");
            // @ts-ignore
            for (let select of selects) {
                select.addEventListener("change", handle_change);
            }
        }
        function update_settings() {
            console.log("Updating settings for project " + globalThis.project_id);
        }
    })(ProjectOverview = Editor.ProjectOverview || (Editor.ProjectOverview = {}));
    let Tools;
    (function (Tools) {
        function hide_all(class_name) {
            // @ts-ignore
            for (let element of document.getElementsByClassName(class_name)) {
                element.classList.add("hide");
            }
        }
        Tools.hide_all = hide_all;
    })(Tools = Editor.Tools || (Editor.Tools = {}));
})(Editor || (Editor = {}));
/// <reference path="ProjectOverview.ts" />
var Editor;
/// <reference path="ProjectOverview.ts" />
(function (Editor) {
    // @ts-ignore
    function init() {
        return __awaiter(this, void 0, void 0, function* () {
            let project_id = extract_project_id_from_url();
            try {
                let project = yield load_project(project_id);
                globalThis.project_id = project_id;
                Editor.ProjectOverview.show_overview(project);
            }
            catch (e) {
                console.error("Couldn't load project: " + e);
            }
        });
    }
    Editor.init = init;
    function extract_project_id_from_url() {
        let url = new URL(window.location.href);
        return url.pathname.split("/")[2];
    }
    // @ts-ignore
    function load_project(project_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`/api/projects/${project_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to load project ${project_id}`);
            }
            else {
                return response.json();
            }
        });
    }
})(Editor || (Editor = {}));
// @ts-ignore
window.addEventListener("load", function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield Editor.init();
    });
});
