[![CircleCI](https://img.shields.io/circleci/project/github/cncf/svg-autocrop/master.svg?logo=circleci)](https://circleci.com/gh/cncf/svg-autocrop) [![npm version](https://img.shields.io/npm/v/svg-autocrop.svg)](https://www.npmjs.com/package/svg-autocrop) [![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/2450/badge)](https://bestpractices.coreinfrastructure.org/projects/2450) [![Dependency Status](https://img.shields.io/david/cncf/svg-autocrop.svg?style=flat-square)](https://david-dm.org/cncf/svg-autocrop)

# svg-autocrop

This NPM module optimizes SVGs to have a consistent (and small) border on each side
and to remove extraneous tags and attributes, so that the resulting files are as small
as possible. The code has been tested and refined on hundreds of real world SVGs so as
to produce reliable results without distortions or to fail with a clear error if there
is an unfixable problem with the source SVG.

It was created to format SVGs for the [CNCF Cloud Native Landscape](https://landscape.cncf.io)
and has been extracted out to be usable by any application looking for reliable SVG
formatting. It is a dependency of [landscapeapp](https://github.com/cncf/landscapeapp)
which now powers multiple interactive landscapes.

svg-autocrop provides the following functionality on each SVG on which it acts:
* Autocrops by temporarily converting to a bitmap and scanning to find the bounding rectangle of
non-transparent pixels
* Adds a viewbox so that the SVG will not be distorted if placed in a rectangle with
a different ratio
* Uses aggressive settings of [svgo](https://github.com/svg/svgo) to remove a large
amount of useless or redundant information and runs 5 times to eliminate pointless nested groups
* Standardizes the SVG header to the minimum necessary to reliably render
* Fails with an error if the SVG includes a raster image (such as a PNG or JPEG), as
these do not scale seamlessly and needlessly add to the file size
* Fails with an error on SVGs that contain a `<text>` or `<tspan>` element since the
text will not render reliably if the specified fonts are not installed (instead, you
can [convert](https://github.com/cncf/landscape#proper-svgs) the text to an image so that
it will reliably render anywhere)
* Optionally adds a title since that is displayed as the title in the browser tab

svg-autocrop requires a transparent or a white background to work correctly.

For more information on recommended rules for collecting logos, please see the [guidelines](https://github.com/cncf/landscape#logos) for the [CNCF Cloud Native Landscape](https://landscape.cncf.io).

svg-autocrop has been developed by [Andrey Kozlov](https://github.com/ZeusTheTrueGod) and [Dan Kohn](https://www.dankohn.com) of [CNCF](https://www.cncf.io).

## Manually Optimizing SVGs

These directions will let you manually optimize SVGs on a Mac:

*Install (do these once)*
1. Type Cmd-space, enter `terminal` and hit return to open. For each of the commands below, it's easiest to copy and paste from here into the terminal window.
1. Enter: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"` to install [Homebrew](https://brew.sh/)
1. Enter: `brew install node`
1. Type `cd ~/Documents; mkdir -p svg/input; mkdir -p svg/output; open ~/Documents/svg` to create an `svg` folder in your Documents folder with input and output folders inside it
1. Enter: `npm install -g svg-autocrop` to install the latest version of the svg-autocrop command

*Process SVGs*
1. In Finder, go to `Documents`:`svg`:`input` and drag in one or more SVGs that you want to optimize.
1. If terminal is not already running, type Cmd-space, enter `terminal` and hit return to open
1. Type `cd ~/Documents/svg` to go to the proper directory
1. Type `svg-autocrop`
1. If no errors print out, you should see the optimized SVGs in an `output` folder
1. Double-click on each SVG so that it opens in Chrome. Manually veryify that the SVG does not look any different (except cropped)

*Update*
1. Every month or so, you should update the software: `brew update && brew upgrade && npm update -g`
    
## Debugging the project
* yarn test will run a full check on all the images in the fixture folder
* CAPTURE=1 yarn test will run an svg-autocrop on all images in the fixture
folder and then save results
* MATCH=kubernetes yarn test will run a check only on files matching kubernetes in the
* CAPTURE=1 MATCH=kubernetes yarn test will run an svg-autocrop only on files matching kubernetes in the
fixture folder
* yarn fix will convert svg images in the `images` folder


## Vulnerability reporting

Please open an [issue](https://github.com/cncf/svg-autocrop/issues/new) or, for sensitive information, email info@cncf.io.
