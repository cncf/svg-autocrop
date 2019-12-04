const _  = require('lodash');
const Jimp = require('jimp');
const { convert } = require('convert-svg-to-png');
const SVGO = require('svgo');

const maxSize = 16000; //original SVG files should be up to this size
const debugInfo = function() {
    if (process.env.DEBUG_SVG) {
        console.info.apply(this, arguments);
    }
}

const makeHelpers = function(root) {
    return function(x) {
        x.isElem = root.isElem.bind(x);
        x.isEmpty = root.isEmpty.bind(x);
        x.hasAttr = root.hasAttr.bind(x);
        x.attr = root.attr.bind(x);
        x.eachAttr = root.eachAttr.bind(x);
        return x;
    }
}

async function svgo({content, title}) {
    let rootStyle = '';
    let result;
    result = await (new SVGO({
        full: true,
        plugins: [{
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
            removeStyleFromRoot: {
                type: 'full',
                fn: function(data) {
                    const root = data.content[0];
                    const addHelpers = makeHelpers(root);
                    if (root.attrs && root.attrs.style) {
                        rootStyle = `svg {${root.attrs.style.value}}`;
                    }
                    else if (root.content[0].elem === 'style' && root.content[0].content[0].text.indexOf('svg {' === 0)) {
                        rootStyle = root.content[0].content[0].text;
                    }
                    return data;
                }
            }
        }]
    })).optimize(content);

    result = await (new SVGO({
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
            convertPathData: false,
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
            collapseGroups: false,
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
            removeAttrs: {
                attrs: ['aria.*', 'font.*', '-inkspace.*', 'line.*', 'font', 'letter.*', 'word.*', 'direction', 'white.*']
            }
        }, {
            removeTextStyles: {
                type: 'perItem',
                fn: function(item) {
                    if (item.hasAttr('style')) {
                        var elemStyle = item.attr('style').value;
                        const elemParts = elemStyle.split(';').map( (x) => x.trim());
                        const goodParts = elemParts.filter(function(part) {
                            const [name, value] = part.split(':').map( (x) => x.trim());
                            // console.info('Propery:',name);
                            if (name.indexOf('-inkscape') === 0 ) {
                                return false;
                            }
                            if (name.indexOf('line-') === 0) {
                                return false;
                            }
                            if (name.indexOf('font') === 0) {
                                return false;
                            }
                            if (name.indexOf('letter') === 0) {
                                return false;
                            }
                            if (name.indexOf('word') === 0) {
                                return false;
                            }
                            if (name.indexOf('direction') === 0) {
                                return false;
                            }
                            if (name.indexOf('white') === 0) {
                                return false;
                            }
                            return true;
                        });
                        if (goodParts.length > 0) {
                            item.attr('style').value = goodParts.join(';');
                        } else {
                            item.removeAttr('style');
                        }
                    }
                }
            }
        }, {
            cleanupSvgDeclaration: {
                type: 'perItem',
                fn: function(item) {
                    if (item.elem === 'svg') {
                        const xmlns = item.attrs.xmlns;
                        const xmlnsxlink = item.attrs['xmlns:xlink'];
                        item.attrs = { xmlns: xmlns, role: {name: 'role', value: 'img', local: 'role', prefix: ''}};
                        if (xmlnsxlink) {
                            item.attrs['xmlns:xlink'] = xmlnsxlink;
                        }
                    }
                }
            }
        }]
    })).optimize(result.data);

    if (rootStyle) {
        result = await (new SVGO({
            full: true,
            plugins: [{
                addRootStyle: {
                    type: 'full',
                    fn: function(data) {
                        const root = data.content[0];
                        const addHelpers = makeHelpers(root);
                        const styleElem = addHelpers({
                            elem: 'style',
                            prefix: '',
                            local: 'style',
                            content: [addHelpers({text:rootStyle})]
                        })
                        root.content = [styleElem].concat(root.content);
                        return data;
                    }
                }
            }]
        })).optimize(result.data);
    }

    if (title) {
        result = await (new SVGO({
            full: true,
            plugins: [{
                insertTitle: {
                    type: 'full',
                    fn: function(data) {
                        const root = data.content[0];
                        const addHelpers = makeHelpers(root);
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
        })).optimize(result.data);
    }
    return result.data;
}

async function extraTransform(svg) {
    result = await (new SVGO({
        full: true,
        plugins: [{
            collapseGroups: true,
        }, {
            convertPathData: {
                floatPrecision: 5,
                transformPrecision: 7
            }
        }]
    })).optimize(svg);
    return result.data;
}

async function updateViewbox(content, {x, y, width, height}) {
    const newValue = `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
    const svgo = new SVGO({
        full: true,
        plugins: [{
            updateViewbox: {
                type: 'full',
                fn: function(data) {
                    const root = data.content[0];
                    root.attrs.viewBox = {
                        name: 'viewBox',
                        local: 'viewBox',
                        prefix: '',
                        value: newValue
                    };
                    return data;
                }
            }
        }]
    });
    const result = await svgo.optimize(content);
    return result.data;
}

async function getCropRegionWithWhiteBackgroundDetection({svg, image, allowScaling}) {
    const newViewbox = await getCropRegion(image);

    let totalBorderPixels = 0;
    let whiteBorderPixels = 0;
    let totalPixelsInside = 0;
    let transparentPixelsInside = 0;
    let nonWhiteOrNonTransparent = 0;
    debugInfo(newViewbox);
    for (let x = newViewbox.x; x <= newViewbox.x + newViewbox.width; x += 1) {
        for (let y = newViewbox.y; y <= newViewbox.y + newViewbox.height; y += 1) {
            const r = image.bitmap.data[ (y * image.bitmap.width + x) * 4 + 0];
            const g = image.bitmap.data[ (y * image.bitmap.width + x) * 4 + 1];
            const b = image.bitmap.data[ (y * image.bitmap.width + x) * 4 + 2];
            const a = image.bitmap.data[ (y * image.bitmap.width + x) * 4 + 3];
            const isBorderPixel = x === newViewbox.x || x === newViewbox.x + newViewbox.width || y === newViewbox.y || y === newViewbox.y + newViewbox.height;
            const isWhiteBorderPixel = (isBorderPixel && r >= 250 && g >= 250 && b >= 250 );
            const isTransparentPixel = a === 0;
            if (isBorderPixel) {
                totalBorderPixels += 1;
            }
            if (isWhiteBorderPixel) {
                whiteBorderPixels += 1
            }
            totalPixelsInside += 1;
            if (isTransparentPixel) {
                transparentPixelsInside += 1;
            }
        }
    }
    debugInfo({totalBorderPixels, whiteBorderPixels, allowScaling});
    if (totalBorderPixels < 400 && allowScaling) {
        debugInfo('Too few border pixels on estimate - not possible to detect a white background, scaling the image again');
        return newViewbox;
    }
    if (totalBorderPixels < 400 && !allowScaling) {
        debugInfo('Too few border pixels on final - not possible to detect a white background, scaling the image again');
        process.exit(1);
    }

    var borderRatio = totalBorderPixels ? whiteBorderPixels / totalBorderPixels : 0;
    var transparentRatio = totalPixelsInside ? transparentPixelsInside / totalPixelsInside : 0;

    debugInfo(borderRatio, transparentRatio);
    if (borderRatio > 0.99 && transparentRatio < 0.01) {
        debugInfo('Converting image to transparent');
        await whiteToTransparent(image);
        try {
            const result =  await getCropRegion(image);
            debugInfo('Diff in results: ', newViewbox, result);
            return result;
        } catch(ex) {
            debugInfo('Can not return a transparent image, using an original one');
            debugInfo(newViewbox);
            return newViewbox;
        }
    } else {
        return newViewbox;
    }
}

async function getCropRegion(image) {
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
    debugInfo({left, top, right, bottom});
    if (!_.isNumber(left) || !_.isNumber(top) || !_.isNumber(right) || !_.isNumber(bottom)) {
        throw new Error('SVG image has dimension more than 4000x4000, we do not support SVG images of this size or larger');
    }
    // add a 1 pixel border around
    // console.info(left, top, right - left, bottom - top);
    const newViewbox = { x: left, y: top, width: right - left, height: bottom - top };
    return newViewbox;
}

// this method works really fast because it gets a scaled png version for a
// given svg file. So if an svg file is 4000x4000, than a 0.1 scaled version
// is just 400x400 and thus way faster to process
// the obvious side effect that we have a +- (1 / scale) error
async function getEstimatedViewbox({svg, scale}) {
    const svgCopy = svg.toString();
    svg = await updateViewbox(svgCopy, {
        x: -maxSize,
        y: -maxSize,
        width: 2 * maxSize,
        height: 2 * maxSize
    });

    // attempt to convert it again if it fails
    var counter = 3;
    async function tryToConvert() {
        try {
            return await convert(svg, {scale: scale, width: 2 * maxSize,height: 2 * maxSize, puppeteer: {dumpio: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage']}});
        } catch(ex) {
            console.info(ex);
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
        await save('/tmp/r01.png');
    }


    const newViewbox = await getCropRegionWithWhiteBackgroundDetection({svg: svgCopy, image, allowScaling: true});
    if (newViewbox === false) { // too small size
        return await getEstimatedViewbox({svg, scale: scale * 4});    
    }

    const border = 2 / scale;
    // translate to original coordinats
    newViewbox.x = newViewbox.x / scale - maxSize - border;
    newViewbox.y = newViewbox.y / scale - maxSize - border;
    newViewbox.width = newViewbox.width / scale + 2 * border;
    newViewbox.height = newViewbox.height / scale + 2 * border;
    return newViewbox;

}

const compareImages = function(jimp1, jimp2) {
    if (jimp1.bitmap.width !== jimp2.bitmap.width) return false;
    if (jimp1.bitmap.height !== jimp2.bitmap.height) return false;
    let index = 0;
    let diffBytes = 0;
    let maxDiff = 0;
    for (y = 0; y < jimp1.bitmap.height; y ++ ) {
        for (x = 0; x < jimp1.bitmap.width; x++) {
            for (i = 0; i < 4; i ++) {
                if (jimp1.bitmap.data[index] !== jimp2.bitmap.data[index]) {
                    // console.info(x,y,i, jimp1.bitmap.data[index],  jimp2.bitmap.data[index]);
                    diffBytes += 1;
                    maxDiff = Math.max(maxDiff, Math.abs(jimp1.bitmap.data[index] - jimp2.bitmap.data[index]))
                }
                index += 1;
            }
        }
    }
    // console.info(diffBytes, maxDiff);
    return diffBytes === 0;
}

// var sha = function(input){
// return require('crypto').createHash('sha1').update(JSON.stringify(input)).digest('hex')
// }

// If anything is completely white - make it black and transparent
async function whiteToTransparent(image) {
    let c1 = 0, c2 = 0;
    await image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        // x, y is the position of this pixel on the image
        // idx is the position start position of this rgba tuple in the bitmap Buffer
        // this is the image

        var red   = this.bitmap.data[ idx + 0 ];
        var green = this.bitmap.data[ idx + 1 ];
        var blue  = this.bitmap.data[ idx + 2 ];
        var alpha = this.bitmap.data[ idx + 3 ];

        if (red > 250 && green > 250 && blue > 250) {
            c1 += 1;
            this.bitmap.data[idx + 0] = 0;
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
            this.bitmap.data[idx + 3] = 0;
        } else {
            c2 += 1;
        }
    });
    async function save(fileName) {
        const data = await new Promise(function(resolve) {
            image.getBuffer('image/png', function(err, data) {
                resolve(data);
            }); 
        });
        require('fs').writeFileSync(fileName, data);
    }
    if (process.env.DEBUG_SVG) {
        await save('/tmp/r03.png');
    }
    debugInfo({c1, c2});
}

module.exports = async function autoCropSvg(svg, options) {
    options = options || {};
    svg = svg.toString();
    // running it up to 5 times helps to reduce amount of nested groups
    let previousSvg = svg;
    for (var i = 0; i < 5; i ++) {
        svg = await svgo({content: svg, title: options.title});
        if (svg === previousSvg) {
            break;
        } else {
            previousSvg = svg;
        }
    }
    // get a maximum possible viewbox which covers the whole region;
    const width = maxSize;
    const height = maxSize;

    // get a border on a small scale
    const estimatedViewbox = await getEstimatedViewbox({svg, scale: 0.05  });
    if (process.env.DEBUG_SVG) {
        debugInfo('estimated: ', estimatedViewbox);
    }

    //get an svg in that new viewbox
    svg = await updateViewbox(svg, estimatedViewbox);
    // attempt to convert it again if it fails
    // estimated viewBox has a size which is dividable by 20,
    //  because previewScale is 0.05 (x1/20)
    const scale = (function() {
        const maxSize = Math.max(estimatedViewbox.width, estimatedViewbox.height);
        if (maxSize > 8000) {
            return 0.1;
        }
        else if (maxSize > 4000) {
            return 0.2;
        }
        else if (maxSize > 2000) {
            return 0.4;
        }
        else if (maxSize > 1000) {
            return 1;
        }
        else if (maxSize > 500) {
            return 2;
        }
        else if (maxSize > 250) {
            return 4;
        }
        else if (maxSize > 125) {
            return 8;
        }
        else {
            return 10;
        }
    })();
    // console.info('using scale: ', scale);
    var counter = 3;
    async function tryToConvert() {
        try {
            return await convert(svg, {scale: scale, width: estimatedViewbox.width, height: estimatedViewbox.height, puppeteer: {args: ['--no-sandbox', '--disable-setuid-sandbox']}});
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

    // If anything is completely white - make it black and transparent
    // await image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    // // x, y is the position of this pixel on the image
    // // idx is the position start position of this rgba tuple in the bitmap Buffer
    // // this is the image

    // var red   = this.bitmap.data[ idx + 0 ];
    // var green = this.bitmap.data[ idx + 1 ];
    // var blue  = this.bitmap.data[ idx + 2 ];

    // if (red > 230 && green > 230 && blue > 230) {
    // this.bitmap.data[idx + 0] = 0;
    // this.bitmap.data[idx + 1] = 0;
    // this.bitmap.data[idx + 2] = 0;
    // this.bitmap.data[idx + 3] = 0;
    // }
    // });

    if (process.env.DEBUG_SVG) {
        await save('/tmp/r2.png');
    }



    const newViewbox = await getCropRegionWithWhiteBackgroundDetection({image});


    if (process.env.DEBUG_SVG) {
        // image.crop(false);
        // await save('/tmp/r3.png');
        debugInfo(newViewbox);
    }
    // add a bit of padding around the svg
    let extraRatio = 0.02;
    let borderX;
    let borderY;
    if (newViewbox.width > newViewbox.height) {
        borderX = newViewbox.width * extraRatio;
        borderY = borderX;
    } else {
        borderY = newViewbox.height * extraRatio;
        borderX = borderY;
    }

    newViewbox.x = newViewbox.x - borderX;
    newViewbox.y = newViewbox.y - borderY;
    newViewbox.width = newViewbox.width  + 2 * borderX;
    newViewbox.height = newViewbox.height + 2 * borderY;

    // console.info(newViewbox);
    // translate to original coordinats, our estimated svg
    // was saved as a png file starting from (estimatedViewbox.x,estimatedViewbox.y)
    // and having a size (estimatedViewbox.width, estimatedViewbox.height)
    newViewbox.x = newViewbox.x / scale + estimatedViewbox.x;
    newViewbox.y = newViewbox.y / scale + estimatedViewbox.y;
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

    // try extra transformations
    const originalPng = await convert(newSvg, {scale: 0.1, width: newViewbox.width, height: newViewbox.height, puppeteer: {args: ['--no-sandbox', '--disable-setuid-sandbox']}});
    const originalJimp = await Jimp.read(originalPng);

    const transformedSvg = await extraTransform(newSvg);

    async function tryToCompare() {
        for ( i = 0; i < 5; i++ ) {
            const modifiedPng = await convert(transformedSvg, {scale: 0.1, width: newViewbox.width, height: newViewbox.height, puppeteer: {args: ['--no-sandbox', '--disable-setuid-sandbox']}});
            const modifiedJimp = await Jimp.read(modifiedPng);
            if (compareImages(originalJimp, modifiedJimp)) {
                return true;
            }
        }
        return false;
    }
    if (process.env.DEBUG_SVG) {
        console.time('compare');
    }
    let compareResult = await tryToCompare();
    if (process.env.DEBUG_SVG) {
        console.timeEnd('compare');
        console.info({compareResult});
    }
    if (compareResult) {
        return {
            result: transformedSvg,
            skipRiskyTransformations: false
        }
    } else {
        debugInfo('different');
        return {
            result: newSvg,
            skipRiskyTransformations: true
        }
    }

}

