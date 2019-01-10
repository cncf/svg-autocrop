const {Builder, Parser} = require('xml2js');
const _  = require('lodash');
const Jimp = require('jimp');
const { convert } = require('convert-svg-to-png');

const maxSize = 4000; //original SVG files should be up to this size
const scale = 0.25; // and we scale it back to just 1000 pixels to speed up everything

async function svgo({content, title}) {
    const SVGO = require('svgo');
    const svgo = new SVGO({
        plugins: [{
            cleanupAttrs: true,
        }, {
            inlineStyles: true
        }, {
            removeDoctype: true,
        },{
            removeXMLProcInst: true,
        },{
            removeComments: true,
        },{
            removeMetadata: true,
        },{
            removeTitle: true,
        },{
            removeDesc: true,
        },{
            removeUselessDefs: true,
        },{
            removeEditorsNSData: true,
        },{
            removeEmptyAttrs: true,
        },{
            removeHiddenElems: true,
        },{
            removeEmptyText: true,
        },{
            removeEmptyContainers: true,
        },{
            removeDimensions: true,
        },{
            cleanupEnableBackground: true,
        },{
            minifyStyles: true,
        },{
            convertStyleToAttrs: true,
        },{
            convertColors: true,
        },{
            convertPathData: true,
        },{
            convertTransform: true,
        },{
            removeUnknownsAndDefaults: true,
        },{
            removeNonInheritableGroupAttrs: true,
        },{
            removeUselessStrokeAndFill: true,
        },{
            removeUnusedNS: true,
        },{
            cleanupIDs: true,
        },{
            cleanupNumericValues: true,
        },{
            cleanupListOfValues: true,
        },{
            moveElemsAttrsToGroup: true,
        },{
            moveGroupAttrsToElems: true,
        },{
            collapseGroups: true,
        },{
            removeRasterImages: false,
        },{
            mergePaths: true,
        },{
            convertShapeToPath: true,
        },{
            sortAttrs: true,
        },{
            removeDimensions: true,
        }, {
            removeScriptElements: true
        }, {
            cleanupSvgDeclaration: {
                type: 'perItem',
                fn: function(item) {
                    if (item.elem === 'svg') {
                        const xmlns = item.attrs.xmlns;
                        const xmlnsxlink = item.attrs['xmlns:xlink'];
                        item.attrs = { xmlns: xmlns};
                        if (xmlnsxlink) {
                            item.attrs['xmlns:xlink'] = xmlnsxlink;
                        }
                    }
                }
            }
        }]
    });
    const result = await svgo.optimize(content);
    if (!title) {
        return result.data;
    }
    const svgo2 = new SVGO({
        full: true,
        plugins: [{
            insertTitle: {
                type: 'full',
                fn: function(data) {
                    const root = data.content[0];
                    const addHelpers = function(x) {
                        x.isElem = root.isElem.bind(x);
                        x.isEmpty = root.isEmpty.bind(x);
                        x.hasAttr = root.hasAttr.bind(x);
                        x.attr = root.attr.bind(x);
                        x.eachAttr = root.eachAttr.bind(x);
                        return x;
                    }
                    root.content = [addHelpers({
                        elem: 'title',
                        prefix: '',
                        local: 'title',
                        content: [addHelpers({text: title})]
                    })].concat(root.content);
                    return data;
                }
            }
        }]
    });
    const result2 = await svgo2.optimize(result.data);
    return result2.data;
}

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
      return {x: 0, y: 0, width: maxSize, height: maxSize};
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
      return {x: 0, y: 0, width: maxSize, height: maxSize};
    }
  }
}

async function updateViewbox(content, {x, y, width, height}) {
  const viewBox = (content.match(/viewBox="(.*?)"/) || {})[1];
  const newValue = `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
    // console.info(newValue);
  if (viewBox) {
    return content.replace(/viewBox="(.*?)"/, `viewBox="${newValue}"`);
  } else {
    return content.replace('<svg ', `<svg viewBox="${newValue}" `);
  }
}

async function removeWidthAndHeight(svg) {
  const svgElementIndex = svg.indexOf('<svg');
  if (svgElementIndex === -1) {
      return svg;
  }
  const partWithSvg = svg.substring(svgElementIndex);
  var js;
  try  {
    js = await svg2js(svg);
  } catch(ex) {
    return svg; //
  }

  const existingWidth = js.svg.$.width;
  const existingHeight = js.svg.$.height;
  const existingPreserveAspectRatio = js.svg.$.existingAspectRatio;

  let result = partWithSvg;
  if (existingWidth) {
      result = result.replace(` width="${existingWidth}"`, '');
      result = result.replace(` width="${existingWidth}"`, '');
      // console.info('replcaing width');
  };
  if (existingHeight) {
      result = result.replace(` height="${existingHeight}"`, '');
      result = result.replace(`height="${existingHeight}"`, '');
      // console.info('replcaing height', `height="${existingHeight}"`);
  }
  if (existingPreserveAspectRatio) {
      // console.info('replcaing ar');
      result = result.replace(` preserveAspectRatio="${existingPreserveAspectRatio}"`, '');
      result = result.replace(`preserveAspectRatio="${existingPreserveAspectRatio}"`, '');
  }
  return svg.substring(0, svgElementIndex) + result;
}

module.exports = async function autoCropSvg(svg, options) {
  options = options || {};
  svg = svg.toString();
  // runnint it 5 times helps to reduce amount of nested groups
  svg = await svgo({content: svg, title: options.title});
  svg = await svgo({content: svg, title: options.title});
  svg = await svgo({content: svg, title: options.title});
  svg = await svgo({content: svg, title: options.title});
  svg = await svgo({content: svg, title: options.title});
  // get a maximum possible viewbox which covers the whole region;
  const {x, y, width, height } = await getViewbox(svg);
  const maxSizeX = Math.max(Math.abs(x), Math.abs(x + width));
  const maxSizeY = Math.max(Math.abs(y), Math.abs(y + height));

  //get an svg in that new viewbox
  svg = await updateViewbox(svg, {
    x: -maxSizeX,
    y: -maxSizeY,
    width: 2 * maxSizeX,
    height: 2 * maxSizeY
  });
  // width and height attributes break the viewBox
  svg = await removeWidthAndHeight(svg);
  // console.info(svg.substring(0, 500));;


  // attempt to convert it again if it fails
  var counter = 3;
  async function tryToConvert() {
    try {
      return await convert(svg, {scale: 0.25, width: 2 * maxSizeX,height: 2 * maxSizeY, puppeteer: {args: ['--no-sandbox', '--disable-setuid-sandbox']}});
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
      let top, left, right, bottom;
      // pixels go in pack of 4 bytes in the R G B A order
      // thus a pixel has an offset of 4 * (y * width + x)
      // and an alpha channel is at the last position, that a + 3 offset

      // scan from top to bottom, left to right till we find a non transparent pixel
      for (var y = 0; y < image.bitmap.height; y++) {
          for (var x = 0; x < image.bitmap.width; x++) {
              const idx = (image.bitmap.width * y + x) * 4;
              const alpha = image.bitmap.data[idx + 3];
              if (alpha !== 0) {
                  top = y;
                  break;
              }
          }
          if (top) {
              break;
          }
      }
      // scan from bottom to top, left to right till we find a non transparent pixel
      for (var y = image.bitmap.height - 1; y >= 0; y--) {
          for (var x = 0; x < image.bitmap.width; x++) {
              const idx = (image.bitmap.width * y + x) * 4;
              const alpha = image.bitmap.data[idx + 3];
              if (alpha !== 0) {
                  bottom = y;
                  break;
              }
          }
          if (bottom) {
              break;
          }
      }
      // scan from left to right, top to bottom till we find a non transparent pixel
      for (var x = 0; x < image.bitmap.width; x++) {
          for (var y = 0; y < image.bitmap.height; y++) {
              const idx = (image.bitmap.width * y + x) * 4;
              const alpha = image.bitmap.data[idx + 3];
              if (alpha !== 0) {
                  left = x;
                  break;
              }
          }
          if (left) {
              break;
          }
      }
      // scan from right to left, top to bottom till we find a non transparent pixel
      for (var x = image.bitmap.width - 1; x >= 0; x--) {
          for (var y = 0; y < image.bitmap.height; y++) {
              const idx = (image.bitmap.width * y + x) * 4;
              const alpha = image.bitmap.data[idx + 3];
              if (alpha !== 0) {
                  right = x;
                  break;
              }
          }
          if (right) {
              break;
          }
      }
      if (!left || !top || !right || !bottom) {
          throw new Error('SVG image has dimension more than 4000x4000, we do not support SVG images of this size or larger');
      }
      const newViewbox = { x: left, y: top, width: right - left, height: bottom - top };
      return newViewbox;
  }


  const newViewbox = await getCropRegion();
  if (process.env.DEBUG_SVG) {
    // image.crop(false);
    // await save('/tmp/r3.png');
  }
  // console.info(newViewbox);
  // add a bit of padding around the svg
  let extraRatio = 0.02;
  newViewbox.x = newViewbox.x - Math.max(newViewbox.width * extraRatio, 1);
  newViewbox.y = newViewbox.y - Math.max(newViewbox.height * extraRatio, 1);
  newViewbox.width = newViewbox.width  + 2 * Math.max(newViewbox.width * extraRatio, 1);
  newViewbox.height = newViewbox.height + 2 * Math.max(newViewbox.height * extraRatio, 1);

  // translate to original coordinats
  newViewbox.x = newViewbox.x / scale - maxSizeX;
  newViewbox.y = newViewbox.y / scale - maxSizeY;
  newViewbox.width = newViewbox.width / scale;
  newViewbox.height = newViewbox.height / scale;
  // console.info(newViewbox);
  // apply a new viewbox to the svg
  const newSvg = await updateViewbox(svg, newViewbox);

  // validate svg for common errors
  if (newSvg.indexOf('base64,') !== -1) {
      throw new Error('SVG file embeds a png. Please use a pure svg file');
  }
  if (newSvg.indexOf('<text') !== -1) {
      throw new Error('SVG file has a <text> element. Please convert it to the glyph first, because we can not render it the same way on all computers, especially on our render server');
  }
  if (newSvg.indexOf('<tspan') !== -1) {
      throw new Error('SVG file has a <tspan> element. Please convert it to the glyph first, because we can not render it the same way on all computers, especially on our render server');
  }

  if (options.title) {

  }


  return newSvg;
}

