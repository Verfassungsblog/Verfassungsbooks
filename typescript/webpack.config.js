const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        neditor: './Editor.ts',
        settings: './Settings.ts',
        import: './Import.ts',
        bibliography_editor: './BibliographyEditor.ts',
        user_tools: './UserTools.ts',
        template_editor: './TemplateEditor.ts',
        export: './Export.ts',
        section_editor: './SectionEditor.ts'
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, '../static/js'),
    },
};