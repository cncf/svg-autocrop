const TextToSVG = require('text-to-svg');
const textToSVG = TextToSVG.loadSync();

const attributes = {fill: 'red'};
const options = {x: 0, y: 0, fontSize: 72, anchor: 'left top', attributes: attributes};

const svg = textToSVG.getPath('hello world', options);
const metrics = textToSVG.getMetrics('hello world', options);

const input1 = require('fs').readFileSync('./fixtures/ibm-cloud.output.svg', 'utf-8');
const viewBox = input1.match(/viewBox="(.*?)"/)[1];
console.info(viewBox.split(' '));

const svgWidth = +viewBox.split(' ')[2];
const svgHeight = +viewBox.split(' ')[3];
const x = +viewBox.split(' ')[0];
const y = +viewBox.split(' ')[1];


const scale = svgWidth / metrics.width;
const textHeight = metrics.height * scale;

const textX = x;
const textY = svgHeight;

const newSvgHeight = svgHeight + textHeight;

options.attributes.transform = `scale(${scale}) translate(${textX / scale}, ${textY / scale})`;

const textPath = textToSVG.getPath('hello world', options);

const newViewport = [x, y, svgWidth, newSvgHeight].join(' ');

const output1 = input1.replace('</svg>', textPath + '</svg>');

require('fs').writeFileSync('/tmp/1.svg',  output1);
