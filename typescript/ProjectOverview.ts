/// <reference path="Editor.ts" />
namespace Editor{
    export namespace ProjectOverview{
        export function show_overview(project_data: Object) {

            // @ts-ignore
            let details = Handlebars.templates.editor_main_project_overview(project_data);
            document.getElementsByClassName("editor-details")[0].innerHTML = details;
            console.log(project_data);
            attach_ddc_handlers();

            document.getElementById("project_settings_toc_enabled").addEventListener("change", update_settings);
        }

        function attach_ddc_handlers(){
            let handle_change = function(this: HTMLSelectElement){
                let value = parseInt(this.options[this.selectedIndex].value);

                // Hide all sub selects
                if(this.classList.contains("ddc_first_level")){
                    Tools.hide_all("ddc_second_level");
                    Tools.hide_all("ddc_third_level");
                }else if(this.classList.contains("ddc_second_level")){
                    Tools.hide_all("ddc_third_level");
                }

                // Show the sub select
                let sub_select = document.getElementById("project_metadata_ddc_"+value);
                if(sub_select){
                    sub_select.classList.remove("hide");
                }
                console.log(value);
            };

            let selects = document.getElementsByClassName("ddc_select");
            // @ts-ignore
            for(let select of selects){
                select.addEventListener("change", handle_change);
            }
        }

        function update_settings(){
            console.log("Updating settings for project "+globalThis.project_id);
        }
    }

    export namespace Tools{
        export function hide_all(class_name: string){
            // @ts-ignore
            for(let element of document.getElementsByClassName(class_name)){
                element.classList.add("hide");
            }
        }
    }
}
