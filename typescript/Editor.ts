/// <reference path="ProjectSettings.ts" />
namespace Editor{
    export function init(){
        ProjectSettings.load_metadata_settings("test");
    }
}
window.addEventListener("load", (event) => {
    Editor.init();
});