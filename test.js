const _ = require('lodash');
const compareBoxes = require('./compareBoxes');
const autoCropSvg  = require('./index');
const captureMode = !!process.env['CAPTURE'];
const match = process.env['MATCH'];

async function main() {
    const files = require('fs').readdirSync('fixtures');
    const inputFiles = files.filter( (x) => x.indexOf('input') !== -1).filter( match ? ((x) => x.indexOf(match) !== -1) : (x) => true) ;
    const inputFileAsJson = JSON.stringify(inputFiles.map( (x) => x.replace('.input.svg', '')));
    const compareContent = require('fs').readFileSync('./compare.html', 'utf-8');
    const newContent = compareContent.replace(/const files = (.*)$/m, `const files = ${inputFileAsJson}`);
    require('fs').writeFileSync('./compare.html', newContent);
    console.info(inputFiles);
    for (var file of inputFiles) {
        const inputFile = `./fixtures/${file}`;
        const outputFile = `./fixtures/${file.replace('input','output')}`;
        const errorFile = `./fixtures/${file.replace('input','error').replace('.svg', '.txt')}`;
        const inputContent = require('fs').readFileSync(inputFile, 'utf-8');
        let convertedSvg;
        let errorMessage;
        console.info(`Processing: ${inputFile}`);
        try {
            const result = await autoCropSvg(inputContent, {title: `${file} logo`});
            convertedSvg = result.result;
        } catch (ex) {
            console.info(ex);
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
                const separateContentAndViewbox = function(svg) {
                    const viewBox = svg.match(/viewBox="(.*?)"/)[1];
                    const otherContent = svg.replace(/viewBox=".*?"/, "");
                    return {
                        x: +viewBox.split(' ')[0],
                        y: +viewBox.split(' ')[1],
                        width: +viewBox.split(' ')[2],
                        height: +viewBox.split(' ')[3],
                        remaining: otherContent
                    }
		}
                const realParts = separateContentAndViewbox(convertedSvg);
                const expectedParts = separateContentAndViewbox(outputContent);

                const matchingLevel = compareBoxes(realParts, expectedParts);
                if (realParts.remaining !== expectedParts.remaining || matchingLevel < 0.995) {
                    const beautify = require('xml-beautifier');
                    console.info(`Fixture do not match: ${inputFile}, ${outputFile}`);
                    const pd = require('prettydiff');
                    const options = pd.options;
                    options.source = beautify(realParts.remaining);
                    options.diff = beautify(expectedParts.remaining);
                    console.info(pd());
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
