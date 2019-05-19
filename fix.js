#!/usr/bin/env node
const _ = require('lodash');
const path = require('path');
const autoCropSvg  = require('./index');

function getInputFiles() {
    if (process.argv[2] === '--recursive') {
        console.info('Recursive change');
        const dir = process.argv[3] || process.cwd();
        var glob = require("glob");
        const files = glob.sync('**/*.svg', {cwd: dir });
        return {
            inputFiles: files.map( (x) => path.resolve(dir, x)),
            inputFn: (file) => file,
            outputFn: (file) => file
        }
    } else {
        const files = require('fs').readdirSync('input');
        const inputFiles = files.filter( (x) => x.indexOf('.processed.') === -1 && x.indexOf('.svg') !== -1);
        return {
            inputFiles,
            inputFn: (file) => `./input/${file}`,
            outputFn: (file) => `./output/${file}`
        }
    }
}

async function main() {
    const result = [];
    const inputFileOptions = getInputFiles();
    const inputFiles = inputFileOptions.inputFiles;
    const inputFn = inputFileOptions.inputFn;
    const outputFn = inputFileOptions.outputFn;
    for (var file of inputFiles) {
        const inputFile = inputFn(file);
        const outputFile = outputFn(file);
        const inputContent = require('fs').readFileSync(inputFile, 'utf-8');
        try {
            console.info(`Processing ${inputFile} and saving to ${outputFile}`);
            const convertedSvg = await autoCropSvg(inputContent);
            require('fs').writeFileSync(outputFile, convertedSvg);
            result.push({
                name: inputFile,
                input: inputContent,
                output: convertedSvg
            });
            console.info(`Processed ${inputFile} and saved to ${outputFile}`);
        } catch(ex) {
            const message = ex.message || ex;
            console.info(`Failed to process ${inputFile}, error is ${message.substring(0, 1000)}`);
            result.push({
                name: inputFile,
                input: inputContent,
                output: ""
            });
        }
    }

    const compareContent = require('fs').readFileSync('./compare.html', 'utf-8');
    const newContent = compareContent.replace(/const files = (.*)$/m, `const files = ${JSON.stringify(result)}`);
    require('fs').writeFileSync('/tmp/autocrop-compare.html', newContent);
    console.info('Report has been written to file:///tmp/autocrop-compare.html');
}
main().catch(console.info);
