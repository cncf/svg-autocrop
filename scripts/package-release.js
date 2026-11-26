const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const mode = process.argv[2];
const userArgs = process.argv.slice(3);

if (mode !== "pack" && mode !== "publish") {
  throw new Error("Usage: node scripts/package-release.js <pack|publish> [npm options]");
}

function packDestination(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--pack-destination" && args[index + 1]) {
      return path.resolve(process.cwd(), args[index + 1]);
    }
    if (args[index].startsWith("--pack-destination=")) {
      return path.resolve(process.cwd(), args[index].slice("--pack-destination=".length));
    }
  }
  return process.cwd();
}

function runNpm(args, cwd) {
  const result = spawnSync("npm", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    throw new Error(`npm ${args[0]} failed with exit code ${result.status}.`);
  }
  return result.stdout;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-package-"));
const stagedPackage = path.join(tempRoot, "package");

try {
  fs.mkdirSync(stagedPackage);
  fs.cpSync(root, stagedPackage, {
    recursive: true,
    filter(source) {
      const relativePath = path.relative(root, source);
      if (!relativePath) {
        return true;
      }
      return !relativePath
        .split(path.sep)
        .some((segment) => [".git", "node_modules", "scratch"].includes(segment));
    },
  });

  const packageLock = path.join(stagedPackage, "package-lock.json");
  const npmShrinkwrap = path.join(stagedPackage, "npm-shrinkwrap.json");
  if (fs.existsSync(packageLock)) {
    if (fs.existsSync(npmShrinkwrap)) {
      fs.unlinkSync(npmShrinkwrap);
    }
    runNpm(["shrinkwrap", "--silent"], stagedPackage);
  } else if (!fs.existsSync(npmShrinkwrap)) {
    throw new Error("Cannot package without package-lock.json or npm-shrinkwrap.json.");
  }

  const outputDir = mode === "publish" ? tempRoot : packDestination(userArgs);
  if (mode === "pack" && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const packArgs = [
    "pack",
    ...(mode === "pack" ? userArgs : []),
    "--ignore-scripts",
    "--json",
    "--silent",
    `--pack-destination=${outputDir}`,
  ];
  const packOutput = runNpm(packArgs, stagedPackage);
  const packMetadata = JSON.parse(packOutput)[0];

  if (mode === "pack") {
    process.stdout.write(packOutput);
  } else {
    const tarball = path.join(outputDir, packMetadata.filename);
    const publishOutput = runNpm(
      ["publish", tarball, ...userArgs, "--ignore-scripts", "--loglevel=error"],
      root,
    );
    process.stdout.write(publishOutput);
    console.log(
      `${userArgs.includes("--dry-run") ? "Dry run completed for" : "Published"} ${packMetadata.id}.`,
    );
  }
} catch (error) {
  if (!error.status) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = error.status;
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
