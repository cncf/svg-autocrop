const autoCropSvg  = require('./index');

async function main() {
    const input = require('fs').readFileSync('fixtures/white.input.svg', 'utf-8');
    const result = await autoCropSvg(input, {title: `logo`, caption: 'Hello, world! forever', captionWidth: 0.9});
    require('fs').writeFileSync('/tmp/1.svg', result.result);
}
main();
