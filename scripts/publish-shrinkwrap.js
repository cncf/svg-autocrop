const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const packageLock = path.join(packageRoot, "package-lock.json");
const npmShrinkwrap = path.join(packageRoot, "npm-shrinkwrap.json");

if (process.argv[2] === "--cleanup") {
  if (fs.existsSync(npmShrinkwrap)) {
    fs.unlinkSync(npmShrinkwrap);
  }
} else {
  fs.copyFileSync(packageLock, npmShrinkwrap);
}
