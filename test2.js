// testing svgo

var FS = require('fs'),
    PATH = require('path'),
    filepath = PATH.resolve(__dirname, 'agile-stacks.svg'),
    SVGO = require('svgo'),
    svgo = new SVGO({
        pretty: true,
        plugins: [{
            cleanupAttrs: true,
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
            removeViewBox: true,
        },{
            cleanupEnableBackground: true,
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
        }]
    });

const content = require('fs').readFileSync(filepath, 'utf-8');

svgo.optimize(content, {pretty: true, path: filepath}).then(function(result) {
    require('fs').writeFileSync('agile-stacks.processed.svg', result.data); 
        // {
        //     // optimized SVG data string
        //     data: '<svg width="10" height="20">test</svg>'
        //     // additional info such as width/height
        //     info: {
        //         width: '10',
        //         height: '20'
        //     }
        // }
});

