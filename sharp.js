const fs = require('fs');
const sharp = require('sharp');
async function svgToPng(svg, scale) {
    const density = 72 * scale;
    const result = await sharp(svg, { density }).png().toBuffer();
    return result;
}
(async () => {
    const image = fs.readFileSync('fixtures/avi.input.svg');
    const result = await svgToPng(image, 1);
    fs.writeFileSync(`./test.png`, result);
})();
