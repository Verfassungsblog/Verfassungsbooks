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

        interface Heading{
            level: number;
            contents: Array<TextElement>;
        }

        interface ListType{
            Unordered?: boolean;
            Ordered?: boolean;
        }

        interface TextElementOrList{
            TextElement?: TextElement;
            List?: List;
        }

        interface ListItem{
            contents: Array<TextElementOrList>;
        }

        interface List{
            items: Array<ListItem>;
            list_type: string;
            list_type_extra?: ListType;
        }

        interface InnerContentBlock{
            Paragraph?: Paragraph,
            Heading?: Heading,
            List?: List,
            HorizontalRule?: any,
            CustomHTML?: string
        }

        export interface ContentBlock{
            id: string | null;
            revision_id: string | null;
            content: InnerContentBlock;
            css_classes: Array<string> | null;
        }

        function add_extra_fields_for_list(block: List): List{
            if(block.list_type === "Unordered"){
                block.list_type_extra = {Unordered: true};
            }else if(block.list_type === "Ordered"){
                block.list_type_extra = {Ordered: true};
            }
            let items = [];
            for(let item of block.items){
                for(let content of item.contents){
                    if(content.TextElement){
                        content.TextElement = add_extra_fields(content.TextElement);
                    }else if(content.List){
                        content.List = add_extra_fields_for_list(content.List);
                    }
                }
            }

            return block;
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
            }else if(data.content.Heading){
                   let contents = [];
                    for(let heading of data.content.Heading.contents){
                        contents.push(add_extra_fields(heading));
                    }
                    content = {Heading: {level: data.content.Heading.level, contents: contents}};
            }else if(data.content.List){
                content = {List: add_extra_fields_for_list(data.content.List)};
            }else if(data.content.HorizontalRule){
                content = {HorizontalRule: {}};
            }else if(data.content.hasOwnProperty("CustomHTML")){
                if(data.content.CustomHTML === ""){
                    content = {CustomHTML: " "};
                }else {
                    content = {CustomHTML: data.content.CustomHTML.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;").replace("\n", "<br>")};
                }
            }
            else{
                console.error("Unknown content type: ", data.content);
                throw new Error("Unknown content type: " + data.content);
            }

            let res: ContentBlock = {
                id: data.id,
                revision_id: data.revision_id,
                content: content,
                css_classes: data.css_class
            }

            //TODO: Add extra fields for other types

            return res;
        }

        export function parse_contentblock_from_html(block: HTMLElement): ContentBlock{
            //TODO: Clean up unnecessary splits into multiple text elements (e.g. after formatting got removed)
            let res : ContentBlock = {
                content: undefined,
                css_classes: null,
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
            }else if(type === "heading") {
                let input = block.getElementsByClassName("content_block_heading_input")[0];

                if(input === null){
                    throw new Error("Heading block does not contain a heading input");
                }

                let level = parseInt(input.getAttribute("data-level"));
                let inner_content = input.childNodes;
                let heading_text_contents: Array<TextElement> = [];

                // @ts-ignore
                for(let node of inner_content){
                    heading_text_contents = heading_text_contents.concat(parse_node(node));
                }

                // Remove last line break
                if(heading_text_contents.length > 0 && heading_text_contents[heading_text_contents.length-1].LineBreak){
                    heading_text_contents.pop();
                }

                res.content = {Heading: {level: level, contents: heading_text_contents}};
                return res;
            }else if(type === "list") {
                let input = block.getElementsByClassName("content_block_list_input")[0];

                if(input === null){
                    throw new Error("Heading block does not contain a list input");
                }

                let list_type = input.getAttribute("data-type");
                let list_entries: ListItem[] = [];

                // @ts-ignore
                for(let item of input.getElementsByTagName("li")){
                    let list_entry = parse_list_entry(item);

                    // Only add list entry if it contains content
                    if(list_entry.contents.length > 0){
                        // Only add list entry if it isn't just a single line break
                        if(!(list_entry.contents.length === 1 && list_entry.contents[0].TextElement.LineBreak)) {
                            list_entries.push(parse_list_entry(item));
                        }
                    }
                }

                res.content = {List: {items: list_entries, list_type: list_type}};
                return res;
            }else if(type === "custom_html"){
                let custom_html = block.getElementsByClassName("content_block_custom_html_input")[0];

                if(custom_html === null){
                    throw new Error("Custom HTML block does not contain a custom html input");
                }

                let content = new DOMParser().parseFromString(custom_html.innerHTML.replace("<br>", "\n"), "text/html").documentElement.textContent;

                res.content = {CustomHTML: content};
                return res;
            }

            else{
                console.error("Unknown block type to parse: ", type);
                throw new Error("Unknown block type to parse: " + type);
            }
        }

        function parse_list_entry(entry: HTMLElement): ListItem{
            let children = entry.childNodes;
            let list_entry: ListItem = {contents: []};

            // @ts-ignore
            for(let node of children){
                // Check if node is another ul or ol
                if (node.nodeType === Node.ELEMENT_NODE) {
                    let el = node as HTMLElement;

                    //Check if entry is a list -> parse recursively
                    if(el.tagName === 'UL'){
                        let new_list : List = {items: [], list_type: "Unordered"};
                        // @ts-ignore
                        for(let item of el.getElementsByTagName("li")){
                            new_list.items.push(parse_list_entry(item));
                        }

                        list_entry.contents.push({List: new_list});
                        continue;
                    }else if(el.tagName === 'OL'){
                        let new_list : List = {items: [], list_type: "Ordered"};
                        // @ts-ignore
                        for(let item of el.getElementsByTagName("li")){
                            new_list.items.push(parse_list_entry(item));
                        }

                        list_entry.contents.push({List: new_list});
                        continue;
                    }
                }

                // If node is not a list, parse it as a text element and add it to the list entry
                let entry_content = parse_node(node);
                for(let content of entry_content){
                    list_entry.contents.push({TextElement: content});
                }
            }

            return list_entry;
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