const _ = require('lodash');
const autoCropSvg  = require('./index');

async function main() {
    const files = require('fs').readdirSync('fixtures');
    const inputFiles = files.filter( (x) => x.indexOf('input') !== -1);
    for (var file of inputFiles.slice(0, 5555)) {
        const inputFile = `./fixtures/${file}`;
        const outputFile = `./fixtures/${file.replace('input','output')}`;
        const inputContent = require('fs').readFileSync(inputFile, 'utf-8');
        const convertedSvg = await autoCropSvg(inputContent);
        console.info(inputFile);
        require('fs').writeFileSync(outputFile, convertedSvg);
        // const outputContent = require('fs').readFileSync(outputFile, 'utf-8');
        // if (convertedSvg !== outputContent) {
            // console.info(`Fixture do not match: ${inputFile}, ${outputFile}`, convertedSvg.substring(0, 1000), outputContent.substring(0, 1000));
            // process.exit(1);
        // } else {
            // console.info('Match');
        // }
    }
}
main().catch(console.info);
