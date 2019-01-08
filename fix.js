const _ = require('lodash');
const autoCropSvg  = require('./index');

async function main() {
    const files = require('fs').readdirSync('images');
    const inputFiles = files.filter( (x) => x.indexOf('.processed.') === -1 && x.indexOf('.svg') !== -1);
    for (var file of inputFiles) {
        const inputFile = `./images/${file}`;
        const outputFile = `./images/${file.replace('.svg','.processed.svg')}`;
        const inputContent = require('fs').readFileSync(inputFile, 'utf-8');
        try {
            const convertedSvg = await autoCropSvg(inputContent);
            require('fs').writeFileSync(outputFile, convertedSvg);
            console.info(`Processed ${inputFile} and saved to ${outputFile}`);
        } catch(ex) {
            const message = ex.message || ex;
            console.info(`Failed to process ${inputFile}, error is ${message.substring(0, 1000)}`);
        }
    }
}
main().catch(console.info);
