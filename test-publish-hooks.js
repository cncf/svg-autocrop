// LOCKED: regression for failed npm publish preserving the tracked lockfile
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = __dirname;
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-publish-test-"));

function createFixture(name) {
  const dir = path.join(tempDir, name);
  fs.mkdirSync(dir);

  const scripts = {};
  for (const script of ["prepublishOnly", "postpublish", "prepack", "postpack"]) {
    if (packageJson.scripts[script]) {
      scripts[script] = packageJson.scripts[script];
    }
  }

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: `svg-autocrop-${name}`, version: "1.0.0", scripts }),
  );
  fs.writeFileSync(
    path.join(dir, "package-lock.json"),
    JSON.stringify({
      name: `svg-autocrop-${name}`,
      version: "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: { "": { name: `svg-autocrop-${name}`, version: "1.0.0" } },
    }),
  );

  const helperDir = path.join(root, "scripts");
  if (fs.existsSync(helperDir)) {
    fs.cpSync(helperDir, path.join(dir, "scripts"), { recursive: true });
  }
  return dir;
}

function runNpm(args, cwd) {
  return spawnSync("npm", args, {
    cwd,
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, CI: "true" },
  });
}

try {
  const packDir = createFixture("pack");
  const packResult = runNpm(["pack", "--dry-run", "--json", "--silent"], packDir);
  assert.strictEqual(packResult.status, 0, packResult.stderr);

  const packedFiles = JSON.parse(packResult.stdout)[0].files.map((file) => file.path);
  assert(packedFiles.includes("npm-shrinkwrap.json"));
  assert(!packedFiles.includes("package-lock.json"));
  assert(fs.existsSync(path.join(packDir, "package-lock.json")));
  assert(!fs.existsSync(path.join(packDir, "npm-shrinkwrap.json")));

  const publishDir = createFixture("publish");
  const publishResult = runNpm(
    [
      "publish",
      "--registry=http://127.0.0.1:1",
      "--fetch-retries=0",
      "--fetch-timeout=2000",
      "--silent",
    ],
    publishDir,
  );
  assert.notStrictEqual(publishResult.status, 0);
  assert(fs.existsSync(path.join(publishDir, "package-lock.json")));
  assert(!fs.existsSync(path.join(publishDir, "npm-shrinkwrap.json")));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
