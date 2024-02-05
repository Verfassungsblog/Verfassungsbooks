namespace Editor{
    export namespace ContentBlockParser{

        export interface TextFormat{ //This has to be converted to a string for the API, e.g. FormattedText{[...],format: "Bold Italic"}
            Bold? : boolean,
            Italic? : boolean,
            Underline? : boolean,
            Strikethrough? : boolean,
            Superscript? : boolean,
            Subscript? : boolean,
            None? : boolean
        }
        interface FormattedText{
            contents: Array<TextElement>;
            format: string;
            format_extra?: TextFormat
        }
        interface Link{
            url: string;
            text: Array<TextElement> | null;
        }
        enum NoteType{
            Footnote = "Footnote",
            Endnote = "Endnote"
        }
        interface Note{
            note_type_extra?: NoteType,
            note_type: string,
            content: Array<TextElement>
        }
        interface TextElement{
            String?: string;
            FormattedText?: FormattedText;
            Link?: Link;
            Note?: Note;
            LineBreak?: any;
        }

        interface Paragraph{
            contents: Array<TextElement>;
        }

        interface InnerContentBlock{
            Paragraph?: Paragraph
        }

        export interface ContentBlock{
            id: string | null;
            revision_id: string | null;
            content: InnerContentBlock;
            css_class: Array<string> | null;
        }


        function add_extra_fields(block: TextElement): TextElement{
            if(block.String){
                return block;
            }
            if(block.FormattedText){
                let format = block.FormattedText.format;
                let format_extra = block.FormattedText.format_extra;

                if(!format_extra){
                    if(format === "Bold"){
                        format_extra = {Bold: true};
                    }else if(format === "Italic"){
                        format_extra = {Italic: true};
                    }else if(format === "Underline"){
                        format_extra = {Underline: true};
                    }else if(format === "Strikethrough") {
                        format_extra = {Strikethrough: true};
                    }else if(format === "Superscript") {
                        format_extra = {Superscript: true};
                    }else if(format === "Subscript") {
                        format_extra = {Subscript: true};
                    }else if(format === "None") {
                        format_extra = {None: true};
                    }
                }
                let contents = [];
                for(let content of block.FormattedText.contents){
                    contents.push(add_extra_fields(content));
                }
                return {FormattedText: {contents: contents, format: format, format_extra: format_extra}};
            }
            if(block.Link){
                let text = block.Link.text;
                if(text){
                    let contents = text.map(add_extra_fields);
                    return {Link: {url: block.Link.url, text: contents}};
                }else{
                    return {Link: {url: block.Link.url, text: null}};
                }
            }
            if(block.Note){
                let contents = block.Note.content.map(add_extra_fields);
                let note_type = block.Note.note_type;
                let note_type_extra = block.Note.note_type_extra;
                if(!note_type_extra){
                    if(note_type === "Footnote"){
                        note_type_extra = NoteType.Footnote;
                    }else if(note_type === "Endnote"){
                        note_type_extra = NoteType.Endnote;
                    }
                }

                return {Note: {note_type: block.Note.note_type, note_type_extra: note_type_extra, content: contents}};
            }
            return block;
        }

        export function contentblock_from_api(data: any): ContentBlock{
            let content;
            if(data.content.Paragraph){
                let contents = [];
                for(let paragraph of data.content.Paragraph.contents){
                    contents.push(add_extra_fields(paragraph));
                }
                content = {Paragraph: {contents: contents}};
            }else{
                console.error("Unknown content type: ", data.content);
                throw new Error("Unknown content type: " + data.content);
            }

            let res: ContentBlock = {
                id: data.id,
                revision_id: data.revision_id,
                content: content,
                css_class: data.css_class
            }

            //TODO: Add extra fields for other types

            return res;
        }

        export function parse_contentblock_from_html(block: HTMLElement): ContentBlock{
            //TODO: Clean up unnecessary splits into multiple text elements (e.g. after formatting got removed)
            let res : ContentBlock = {
                content: undefined,
                css_class: null,
                id: block.getAttribute("data-block-id") || null,
                revision_id: null
            }

            let type = block.getAttribute("data-block-type");

            if(type === "paragraph"){
                let p_tag = block.querySelector("p");
                if(p_tag === null){
                    throw new Error("Paragraph block does not contain a p tag");
                }
                let inner_content = p_tag.childNodes;

                let paragraph_contents: Array<TextElement> = [];

                // @ts-ignore
                for(let node of inner_content){
                    paragraph_contents = paragraph_contents.concat(parse_node(node));
                }

                // Remove last line break
                if(paragraph_contents.length > 0 && paragraph_contents[paragraph_contents.length-1].LineBreak){
                    paragraph_contents.pop();
                }

                res.content = {Paragraph: {contents: paragraph_contents}};
                return res
            }else{
                console.error("Unknown block type to parse: ", type);
                throw new Error("Unknown block type to parse: " + type);
            }
        }

        function parse_node(node: Node): Array<TextElement>{
            console.log("Parsing node: ");
            console.log(node);
            let res: Array<TextElement> = [];

            // Simple Text
            if(node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent.replace('​', "").replace("\n", "").replace(/ {2,}/g, ' ');

                /*if(text.length > 0){
                    res.push({String: text+" "});
                }*/
                if(text.length > 0){
                    res.push({String: text});
                }
            }
            // Formatted Text, Link, Note
            if(node.nodeType === Node.ELEMENT_NODE){
                let el = node as HTMLElement;

                // Line Break
                if(el.tagName === "BR"){
                    res.push({LineBreak: {}});
                }

                // Formatted Text
                if(el.classList.contains("formatted_text")){
                    let format_extra: TextFormat = {};
                    let format = "";

                    if(el.classList.contains("formatted_text_bold")){
                        format_extra.Bold = true;
                        format = "Bold";
                    }else if(el.classList.contains("formatted_text_italic")) {
                        format_extra.Italic = true;
                        format = "Italic";
                    }else if(el.classList.contains("formatted_text_underline")) {
                        format_extra.Underline = true;
                        format = "Underline";
                    }else if(el.classList.contains("formatted_text_strikethrough")) {
                        format_extra.Strikethrough = true;
                        format = "Strikethrough";
                    }else if(el.classList.contains("formatted_text_superscript")) {
                        format_extra.Superscript = true;
                        format = "Superscript";
                    }else if(el.classList.contains("formatted_text_subscript")) {
                        format_extra.Subscript = true;
                        format = "Subscript";
                    }else if(el.classList.contains("formatted_text_none")) {
                        format_extra.None = true;
                        format = "None";
                    }else{
                        console.error("Unknown formatted text class: ", el.classList);
                        throw new Error("Unknown formatted text class: " + el.classList);
                    }

                    let contents: Array<TextElement> = [];
                    // @ts-ignore
                    for(let child of el.childNodes){
                        contents = contents.concat(parse_node(child));
                        // TODO: merge consecutive strings

                    } //TODO: check if we really need format_extra
                    res.push({FormattedText: {contents: contents, format: format, format_extra: format_extra}});
                }

                // Link
                if(el.classList.contains("link")){
                    let link = el as HTMLAnchorElement;
                    res.push({Link: {url: link.href, text: parse_node(link)}}); //TODO set text to null if it is empty
                }

                //TODO: implement notes
            }

            return res;
        }
    }
}