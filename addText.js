// edit an existing svg file and add a text
module.exports = function(options) {
    options.color = options.color || 'red';
    options.text = options.text || 'Hello world!';
    options.captionWidth = options.captionWidth || 0.9;
    if (!options.input) {
        throw new Error('input not provided');
    }

    const TextToSVG = require('text-to-svg');
    const textToSVG = TextToSVG.loadSync(require('path').resolve(__dirname, './SourceSansPro-Bold.otf'));
    const attributes = {fill: options.color};
    const convertOptions = {x: 0, y: 0, fontSize: 72, anchor: 'left top', attributes: attributes};

    const svg = textToSVG.getPath(options.text, convertOptions);
    const metrics = textToSVG.getMetrics(options.text, convertOptions);

    const viewBox = options.input.match(/viewBox="(.*?)"/)[1];
    console.info(viewBox.split(' '));

    const svgWidth = +viewBox.split(' ')[2];
    const svgHeight = +viewBox.split(' ')[3];
    const x = +viewBox.split(' ')[0];
    const y = +viewBox.split(' ')[1];


    const scale = options.captionWidth * svgWidth / metrics.width;
    const textHeight = metrics.height * scale;

    const textX = x + svgWidth * ( 1 - options.captionWidth) / 2;
    const textY = y + svgHeight;

    const newSvgHeight = svgHeight + textHeight;

    convertOptions.attributes.transform = `scale(${scale}) translate(${textX / scale}, ${textY / scale})`;

    const textPath = textToSVG.getPath(options.text, convertOptions);

    const newViewBox = [x, y, svgWidth, newSvgHeight].join(' ');

    const output = options.input.replace('</svg>', textPath + '</svg>').replace(viewBox, newViewBox);
    return output;
}
