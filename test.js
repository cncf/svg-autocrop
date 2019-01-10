const _ = require('lodash');
const autoCropSvg  = require('./index');
const captureMode = !!process.env['CAPTURE'];
const match = process.env['MATCH'];

async function main() {
    const files = require('fs').readdirSync('fixtures');
    const inputFiles = files.filter( (x) => x.indexOf('input') !== -1).filter( match ? ((x) => x.indexOf(match) !== -1) : (x) => true) ;
    console.info(inputFiles);
    for (var file of inputFiles) {
        const inputFile = `./fixtures/${file}`;
        const outputFile = `./fixtures/${file.replace('input','output')}`;
        const errorFile = `./fixtures/${file.replace('input','error').replace('.svg', '.txt')}`;
        const inputContent = require('fs').readFileSync(inputFile, 'utf-8');
        let convertedSvg;
        let errorMessage;
        try {
            convertedSvg = await autoCropSvg(inputContent, {title: file});
        } catch (ex) {
            const message = ex.message || ex;
            errorMessage = message;
        }

        if (captureMode) {
            if (convertedSvg) {
                require('fs').writeFileSync(outputFile, convertedSvg);
            } else {
                require('fs').writeFileSync(errorFile, errorMessage);
            }
        } else {
            if (convertedSvg) {
                const outputContent = require('fs').readFileSync(outputFile, 'utf-8');
                if (convertedSvg !== outputContent) {
                    console.info(`Fixture do not match: ${inputFile}, ${outputFile}`, convertedSvg.substring(0, 1000), outputContent.substring(0, 1000));
                    process.exit(1);
                } else {
                    console.info('Match');
                }
            } else {
                const expectedMessage = require('fs').readFileSync(errorFile, 'utf-8');
                console.info('Match');
                if (expectedMessage !== errorMessage) {
                    console.info(`Fixture do not match: on invalid ${inputFile}, error is ${errorMessage}, but we need ${expectedMessage}`);
                    process.exit(1);
                }
            }
        }
    }
}
main().catch(function(x) {
    console.info(x);
    process.exit(1)
});
