const path = require('path');

module.exports = {
    entry: './editor.ts', // Einstiegspunkt deines Frontends
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
        filename: 'bundle.js', // Name der gebündelten Datei
        path: path.resolve(__dirname, '../static/js'), // Ausgabeverzeichnis
    },
};