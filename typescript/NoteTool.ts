export class NoteTool{
    private button: HTMLButtonElement;
    private state: boolean;
    private api: any;

    static get isInline() {
        return true;
    }


    // @ts-ignore
    constructor({data, api}) {
        this.button = null;
        this.state = false;
        this.api = api;

        //TODO: Add the event listeners earlier, so that the notes are clickable from the start.
        NoteTool.add_all_show_note_settings_listeners();
    }

    static add_all_show_note_settings_listeners(){
        let notes = document.getElementsByClassName('note');
        for(let i = 0; i < notes.length; i++){
            notes[i].addEventListener('click', this.show_note_settings_editor);
        }
    }

    /// Get's called when an existing note is clicked.
    static show_note_settings_editor(e: Event){
        // Hide all other note-settings dialogs
        // @ts-ignore
        for(let settings of document.getElementsByClassName('note-settings')){
            settings.remove();
        }

        let note = e.target as HTMLElement;
        console.log("Got clicked by:");
        console.log(note);
        let note_type = note.getAttribute("note-type");
        let note_content = note.getAttribute("note-content");


        let toolbar = document.getElementsByClassName('ce-inline-toolbar')[0] as HTMLElement;

        let settings_dialog_html = "" +
            "<div class='note-settings'>" +
            "<label>Modify Note:</label>" +
            "<select id='note-type' class='form-select form-select-sm'>";

        if(note_type === "footnote"){
            settings_dialog_html += "<option value='footnote' selected>Footnote</option><option value='endnote'>Endnote</option>";
        }else{
            settings_dialog_html += "<option value='footnote'>Footnote</option><option value='endnote' selected>Endnote</option>";
        }

        settings_dialog_html += "</select>" +
            "<textarea id='note-content' class='form-control form-control-sm mt-1'>"+note_content+"</textarea>" +
            "<div style='display: flex; justify-content: space-between'><button id='note-delete' class='btn btn-sm btn-danger mt-1'>Delete Note</button><button id='note-abort' class='btn btn-sm btn-secondary mt-1'>Cancel</button><button id='note-save' class='btn btn-sm btn-primary mt-1'>Save</button></div>" +
            "</div>";
        toolbar.insertAdjacentHTML('afterend', settings_dialog_html);

        let settings_dialog: HTMLElement = toolbar.parentElement.querySelector('.note-settings');

        let note_pos = note.getBoundingClientRect();
        settings_dialog.style.left = note_pos.left + window.scrollX + 'px';
        // Add the same position as the note mark but add 40px to the top
        let currentTop = note_pos.top + window.scrollY;
        settings_dialog.style.top = (currentTop + 40) + 'px';

        let viewport_width = window.innerWidth
        let settings_dialog_width = settings_dialog.getBoundingClientRect().width;
        if((note_pos.left + window.scrollX+ settings_dialog_width) > viewport_width){
            settings_dialog.style.left = (viewport_width - settings_dialog_width) + 'px';
        }


        document.getElementById('note-save').addEventListener('click', () => {
            let note_type = (document.getElementById('note-type') as HTMLSelectElement).value;
            let note_content = (document.getElementById('note-content') as HTMLTextAreaElement).value;

            note.setAttribute("note-type", note_type);
            note.setAttribute("note-content", note_content);
            if(note_type === "footnote"){
                note.innerHTML = "F";
            }else{
                note.innerHTML = "E";
            }

            settings_dialog.remove();
        });

        document.getElementById('note-abort').addEventListener('click', () => {
            settings_dialog.remove();
        });

        document.getElementById('note-delete').addEventListener('click', async () => {
            note.remove();
            settings_dialog.remove();
        });
    }

    render(){
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.textContent = 'Note';
        this.button.classList.add("ce-inline-tool");

        return this.button;
    }

    show_note_settings(range: Range){
        if(document.getElementsByClassName('note-settings').length > 0){
            return;
        }
        let toolbar = document.getElementsByClassName('ce-inline-toolbar')[0] as HTMLElement;

        let settings_dialog_html = "" +
            "<div class='note-settings'>" +
            "<label>Add new Note:</label>" +
            "<select id='note-type' class='form-select form-select-sm'><option value='footnote'>Footnote</option><option value='endnote'>Endnote</option></select>" +
            "<textarea id='note-content' class='form-control form-control-sm mt-1'></textarea>" +
            "<div style='display: flex; justify-content: space-between'><button id='note-abort' class='btn btn-sm btn-secondary mt-1'>Cancel</button><button id='note-save' class='btn btn-sm btn-primary mt-1'>Save</button></div>" +
            "</div>";
        toolbar.insertAdjacentHTML('afterend', settings_dialog_html);

        let settings_dialog: HTMLElement = toolbar.parentElement.querySelector('.note-settings');
        settings_dialog.style.left = toolbar.style.left;
        // Add the same position as the toolbar but add 40px to the top
        let currentTop = parseInt(toolbar.style.top, 10);
        settings_dialog.style.top = (currentTop + 40) + 'px';

        document.getElementById('note-save').addEventListener('click', () => {
            let note_type = (document.getElementById('note-type') as HTMLSelectElement).value;
            let note_content = (document.getElementById('note-content') as HTMLTextAreaElement).value;

            let note = document.createElement('span');
            note.setAttribute("note-type", note_type);
            note.setAttribute("note-content", note_content);
            if(note_type === "footnote"){
                note.innerHTML = "F";
            }else{
                note.innerHTML = "E";
            }
            note.classList.add('note');
            note.addEventListener('click', NoteTool.show_note_settings_editor);
            range.collapse(false);
            range.insertNode(note);
            settings_dialog.remove();
        });

        document.getElementById('note-abort').addEventListener('click', () => {
            settings_dialog.remove();
        });
    }

    surround(range: Range){
        if (this.state) {
            return;
        }
        this.show_note_settings(range)
    }

    checkState(selection: any) {
        const text = selection.anchorNode;

        if (!text) {
            return;
        }

        const anchorElement = text instanceof Element ? text : text.parentElement;

        this.state = !!anchorElement.closest('.note');
    }

    static get sanitize() {
        return {
            span: function(el : any){
                if(el.classList.contains('note')) {
                    if(el.getAttribute("note-type") && el.getAttribute("note-content")){
                        return {
                            "note-type": el.getAttribute("note-type"),
                            "note-content": el.getAttribute("note-content"),
                            class: "note"
                        }
                    }else {
                        return false;
                    }
                }else{
                    return false;
                }
            }
        };
    }
}