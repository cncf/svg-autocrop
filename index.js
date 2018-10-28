const {Builder, Parser} = require('xml2js');
const _  = require('lodash');
const Jimp = require('jimp');
const { convert } = require('convert-svg-to-png');

async function svg2js(content) {
  return new Promise(function(resolve, reject) {
    var parser = new Parser();
    parser.parseString(content, function (err, result) {
      if (err) {
        reject(err);
      } else {
      resolve(result);
      }
    });
  })
}

async function getViewbox(content) {
  try {
    const js = await svg2js(content);
    if (!js.svg.$.viewBox) {
      return {x: 0, y: 0, width: 2000, height: 2000};
    } else {
      const viewBox =  js.svg.$.viewBox;
      const [ x, y, width, height ] = viewBox.replace(/,/g, '').split(' ').map( (x) => +x);
      // console.info(viewBox);
      return {x, y, width, height };
    }
  } catch(ex) {
    const viewBox = content.match(/viewBox="(.*?)"/)[1];
    if (viewBox) {
      const [ x, y, width, height ] = viewBox.replace(/,/g, '').split(' ').map( (x) => +x);
      // console.info(viewBox);
      return {x, y, width, height };
    } else {
      return {x: 0, y: 0, width: 2000, height: 2000};
    }
  }
}

async function updateViewbox(content, {x, y, width, height}) {
  const viewBox = (content.match(/viewBox="(.*?)"/) || {})[1];
  const newValue = `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
    console.info(newValue);
  if (viewBox) {
    return content.replace(/viewBox="(.*?)"/, `viewBox="${newValue}"`);
  } else {
    return content.replace('<svg ', `<svg viewBox="${newValue}" `);
  }
}

async function removeWidthAndHeight(svg) {
  const lines = svg.split('\n');
  const svgLine = _.find(lines, (x) => x.indexOf('<svg ') !== -1);
  if (!svgLine) {
    return svg; //strange
  }
  var js;
  try  {
    js = await svg2js(svg);
  } catch(ex) {
    return svg; //
  }
  if (!js.svg.$.width || !js.svg.$.height) {
    return svg;
  }
  const cleanLine = svgLine.replace(/width=".*?"/, '').replace(/height=".*?"/, '').replace(/preserveAspectRatio=".*?"/, '');
  const newLines = lines.map( (x) => x === svgLine ? cleanLine : x);
  return newLines.join('\n');
}

module.exports = async function autoCropSvg(svg) {
  svg = svg.toString();
  // get a maximum possible viewbox which covers the whole region;
  const {x, y, width, height } = await getViewbox(svg);
  const maxSizeX = Math.max(Math.abs(x), Math.abs(x + width));
  const maxSizeY = Math.max(Math.abs(y), Math.abs(y + height));

  //get an svg in that new viewbox
  svg = await updateViewbox(svg, {
    x: -maxSizeX,
    y: -maxSizeY,
    width: 2* maxSizeX,
    height: 2 * maxSizeY
  });
  // width and height attributes break the viewBox
  svg = await removeWidthAndHeight(svg);


  // attempt to convert it again if it fails
  var counter = 3;
  async function tryToConvert() {
    try {
      return await convert(svg, {width: 2 * maxSizeX,height: 2 * maxSizeY, puppeteer: {args: ['--no-sandbox', '--disable-setuid-sandbox']}});
    } catch(ex) {
      counter -= 1;
      if (counter <= 0) {
        return null;
      }
      return await tryToConvert();
    }
  }

  const png = await tryToConvert();
  if (!png) {
    throw new Error('Not a valid svg');
  }
  const image = await Jimp.read(png);
  async function save(fileName) {
    const data = await new Promise(function(resolve) {
        image.getBuffer('image/png', function(err, data) {
            resolve(data);
        }); 
    });
    require('fs').writeFileSync(fileName, data);
  }
  if (process.env.DEBUG_SVG) {
      await save('/tmp/r1.png');
  }

  // If anything is completely white - make it black
  await image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    // x, y is the position of this pixel on the image
    // idx is the position start position of this rgba tuple in the bitmap Buffer
    // this is the image

    var red   = this.bitmap.data[ idx + 0 ];
    var green = this.bitmap.data[ idx + 1 ];
    var blue  = this.bitmap.data[ idx + 2 ];

    if (red > 230 && green > 230 && blue > 230) {
      this.bitmap.data[idx + 0] = 0;
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
      this.bitmap.data[idx + 3] = 0;
    }
  });

  if (process.env.DEBUG_SVG) {
    await save('/tmp/r2.png');
  }

  async function getCropRegion() {
    const oldCrop = image.crop;
    let newViewbox = { x: 0, y: 0, width: 2 * maxSizeX, height: 2 * maxSizeY };
    image.crop = function(a, b, c, d) {
      console.info('crop: ', a, b, c, d);
      newViewbox = {x: a, y: b, width: c, height: d};
      return;
    }
    console.info('Autocrop!');
    await image.autocrop();
    image.crop = oldCrop;
    return newViewbox;
  }


  const newViewbox = await getCropRegion();
  if (process.env.DEBUG_SVG) {
    image.autocrop(false);
    await save('/tmp/r3.png');

  }
  console.info(newViewbox);
  // add a bit of padding around the svg
  let extraRatio = 0.02;
  newViewbox.x = newViewbox.x - newViewbox.width * extraRatio;
  newViewbox.y = newViewbox.y - newViewbox.height * extraRatio;
  newViewbox.width = newViewbox.width * (1 + 2 * extraRatio);
  newViewbox.height = newViewbox.height * (1 + 2 * extraRatio);

  // translate to original coordinats
  newViewbox.x = newViewbox.x - maxSizeX;
  newViewbox.y = newViewbox.y - maxSizeY;
  console.info(newViewbox);
  // apply a new viewbox to the svg
  const newSvg = await updateViewbox(svg, newViewbox);
  return newSvg;
}

