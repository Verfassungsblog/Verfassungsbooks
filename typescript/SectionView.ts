/// <reference path="Editor.ts" />
namespace Editor{
    export namespace SectionView{
        export function show_section_view(){
            // @ts-ignore
            document.getElementsByClassName("editor-details")[0].innerHTML = Handlebars.templates.editor_section_view();
        }

        function send_get_section_metadata(){

        }
    }
}