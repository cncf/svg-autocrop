[![CircleCI](https://circleci.com/gh/cncf/svg-autocrop.svg?style=svg)](https://circleci.com/gh/cncf/svg-autocrop) [![npm version](https://badge.fury.io/js/svg-autocrop.svg)](https://badge.fury.io/js/svg-autocrop) [![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/2450/badge)](https://bestpractices.coreinfrastructure.org/projects/2450) [![Greenkeeper badge](https://badges.greenkeeper.io/cncf/svg-autocrop.svg)](https://greenkeeper.io/)

# svg-autocrop

This NPM module transforms SVGs to have a consistent (and small) border on each side
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
* Standardizes the XML and SVG header to the minimum necessary to reliably render
* Fails with an error if the SVG includes a raster image (such as a PNG or JPEG), as
these do not scale seamlessly and needlessly add to the file size
* Fails with an error on SVGs that contain a `<text>` or `<tspan>` element since the
text will not render reliably if the specified fonts are not installed (instead, you
can [convert](https://github.com/cncf/landscape#proper-svgs) the text to an image so that
it will reliably render anywhere)
* Optionally adds a title since that is displayed as the title in the browser tab

svg-autocrop expects a transparent or a white background.

For more information on recommended rules for collecting logos, please see the [guidelines](https://github.com/cncf/landscape#logos) for the [CNCF Cloud Native Landscape](https://landscape.cncf.io).

svg-autocrop has been developed by [Andrey Kozlov](https://github.com/ZeusTheTrueGod) and [Dan Kohn](https://www.dankohn.com) of [CNCF](https://www.cncf.io).

## Quick Start

1. Install with:

    ```bash
    yarn
    ```

2. `mkdir` and add SVGs to `./images`.

3. Run with:

    ```bash
    node fix
    ```
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
