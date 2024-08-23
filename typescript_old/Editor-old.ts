/// <reference path="ProjectOverview.ts" />
/// <reference path="SectionView.ts" />
/// <reference path="./ContentBlockParser.ts" />
/// <reference path="Sidebar.ts" />
/// <reference path="./General.ts" />

namespace Editor{
    declare var project_id: string;
    declare var section_id: string | null;
    declare var section_path: string | null;

    // @ts-ignore
    export async function init() {
        let project_id = extract_project_id_from_url();
        globalThis.project_id = project_id;
        ProjectOverview.show_overview();
        // @ts-ignore
        window.add_export_listeners();
    }

    function extract_project_id_from_url(){
        let url = new URL(window.location.href);
        return url.pathname.split("/")[2];
    }

}

// @ts-ignore
window.addEventListener("load", async function(){
    await Editor.init()
});
