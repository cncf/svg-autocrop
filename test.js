const autoCropSvg  = require('./index');

async function main() {
    console.info('test');
    const cropped = await autoCropSvg(require('fs').readFileSync('./agile-stacks.svg', 'utf-8'));
    console.info(cropped);
}
main().catch(console.info);
