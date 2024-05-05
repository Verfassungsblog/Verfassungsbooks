import * as pdfjs from 'pdfjs-dist';

import {send_get_rendering_status, send_render_project} from "./api_requests";

let status_timer : NodeJS.Timeout|null = null;
pdfjs.GlobalWorkerOptions.workerSrc =
    '/js/pdf.worker.mjs';
export async function render_project_listener(){
    if(status_timer !== null){
        // Old rendering is still running, don't start a new one
        return;
    }

    // @ts-ignore
    let project_id : string = <string>globalThis.project_id;

    show_rendering_col();
    let id : string = (await send_render_project(project_id)).data;
    console.log("Rendering id is: ", id);

    status_timer = setTimeout(check_rendering_status, 250, id);

}

async function check_rendering_status(render_id: string){
    let status = await send_get_rendering_status(render_id);
    console.log(status);
    if(status.data === "Queued"){
        console.log("Rendering is still queued");
    }else if(status.data === "Preparing"){
        console.log("Rendering is being prepared");
    }else if(status.data === "Running"){
        console.log("Rendering is running");
    }else if(status.data === "Finished"){
        console.log("Rendering finished");
    }else if(status.data.hasOwnProperty("Failed")){
        console.log("Rendering failed");
        console.log(status.data);
    }

    if(status.data !== "Finished" && !status.data.hasOwnProperty("Failed")) { //TODO: fix failed status
        status_timer = setTimeout(check_rendering_status, 200, render_id);
    }else{
        status_timer = null;
        await show_pdf(render_id); //TODO only show pdf if it was successful
    }
}

async function show_pdf(rendering_id: string){
    let pdf_url = `/download/renderings/`+rendering_id;

    // Show download button
    let download_button = <HTMLLinkElement> document.getElementById("editor_download_pdf_btn");
    download_button.classList.remove("hide");
    download_button.href = pdf_url;

    let scale = 1;
    let viewer = document.getElementById("test");
    viewer.innerHTML = "";

    let loadingTask = pdfjs.getDocument(pdf_url);
    let pdf = await loadingTask.promise;

    for(let page_num = 1; page_num <= pdf.numPages; page_num++){
        let canvas = document.createElement("canvas");
        canvas.classList.add("pdf-page");
        viewer.appendChild(canvas);
        await renderPage(page_num, canvas);
    }

    async function renderPage(pageNumber: number, canvas: HTMLCanvasElement) {
        let page = await pdf.getPage(pageNumber);

        let viewport = page.getViewport({scale: scale});
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            page.render(
                {canvasContext: canvas.getContext('2d'), viewport: viewport});
    }
}



function show_rendering_col(){
    document.getElementById("editor-render-preview").classList.remove("hide");
}