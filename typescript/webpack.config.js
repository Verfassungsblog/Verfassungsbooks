const path = require('path');

module.exports = {
    entry: {
        neditor: './editor.ts',
        settings: './Settings.ts',
        import: './Import.ts',
        bibliography_editor: './BibliographyEditor.ts',
        user_tools: './UserTools.ts',
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