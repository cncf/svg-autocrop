const addText = require('./addText');

const newSvg = addText({
    color: 'blue',
    text: 'Hi there!',
    input: require('fs').readFileSync('fixtures/ambassador.input.svg', 'utf-8')
});
require('fs').writeFileSync('/tmp/1.svg', newSvg);
