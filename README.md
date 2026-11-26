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

svg-autocrop has been developed by [Andrey Kozlov](https://github.com/AndreyKozlov1984) and [Dan Kohn](https://www.dankohn.com) of [CNCF](https://www.cncf.io).

## Command line usage

Installing the package globally gives you an `svg-autocrop` command:

```sh
npm install -g svg-autocrop
```

The install downloads a copy of Chromium (used to render each SVG), so it can take a
minute and needs network access. On Linux, if you installed Node with the system package
manager you may need `sudo npm install -g svg-autocrop`.

The command has two modes and takes no other arguments.

### Crop one or more files into an `output` folder

With no arguments, `svg-autocrop` reads `.svg` files in an `input` folder in the
current directory and writes the cropped copies, with the same file names, to an
`output` folder next to it. Both folders must already exist. Files with `.processed.`
in their name are skipped. The input files are not modified.

To crop a single file:

```sh
mkdir -p svg/input svg/output
cp path/to/logo.svg svg/input/
cd svg
svg-autocrop
```

The cropped file is written to `output/logo.svg`. SVG-processing failures (for
example an SVG containing a raster image or `<text>` element) are reported in the
terminal and that file is skipped.

**Known issue (both modes):** If the current directory has no `compare.html`, the
command prints an `ENOENT` error for `./compare.html` after processing the SVGs.
This only prevents creation of the comparison report; successfully written SVGs
are unaffected.

### Crop every SVG under a directory in place

```sh
svg-autocrop --recursive path/to/directory
```

This finds every `.svg` file under the directory (non-SVG files are ignored) and
overwrites each one with its cropped version, so run it on a copy or on files tracked
in version control. The argument must be a directory, not a file; if omitted it defaults
to the current directory.

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
1. Check that each SVG is reported as `Processed ... and saved to ...` and appears in the `output` folder. The known [`ENOENT` error for `./compare.html`](#command-line-usage) only prevents report creation; a `Failed to process` message means that SVG was skipped.
1. Double-click on each SVG so that it opens in Chrome. Manually verify that the SVG does not look any different (except cropped)

*Update*
1. Every month or so, you should update the software: `brew update && brew upgrade && npm update -g`

## Autocropping multiple SVGs

You can recursively autocrop multiple SVGs (while non-SVG files are ignored) with the command:

`svg-autocrop --recursive ../artwork/`

or, from a clone of this repository, `node fix --recursive ../artwork/`. Set the directory
to where you have images to autocrop. The files are overwritten in place.

## Debugging the project
* npm test will run a full check on all the images in the fixture folder
* CAPTURE=1 npm test will run an svg-autocrop on all images in the fixture
folder and then save results
* MATCH=kubernetes npm test will run a check only on files matching kubernetes in the
* CAPTURE=1 MATCH=kubernetes npm test will run an svg-autocrop only on files matching kubernetes in the
fixture folder
* npm run fix will convert svg images in the `input` folder and save them to the `output` folder


## Vulnerability reporting

Please open an [issue](https://github.com/cncf/svg-autocrop/issues/new) or, for sensitive information, email info@cncf.io.
