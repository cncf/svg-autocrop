const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const packageLock = path.join(packageRoot, "package-lock.json");
const npmShrinkwrap = path.join(packageRoot, "npm-shrinkwrap.json");
const packageJson = require(path.join(packageRoot, "package.json"));

if (process.argv[2] === "--cleanup") {
  // An unpacked npm package has no package-lock.json; keep its authoritative shrinkwrap.
  if (fs.existsSync(packageLock) && fs.existsSync(npmShrinkwrap)) {
    fs.unlinkSync(npmShrinkwrap);
  }
} else if (fs.existsSync(packageLock)) {
  if (packageJson.name === "svg-autocrop") {
    // Keep the source checkout from creating a competing lockfile during packing.
    throw new Error("Use npm run pack:release or npm run publish:release from the source checkout.");
  }
  fs.copyFileSync(packageLock, npmShrinkwrap);
} else if (!fs.existsSync(npmShrinkwrap)) {
  throw new Error("Cannot package without package-lock.json or npm-shrinkwrap.json.");
}
