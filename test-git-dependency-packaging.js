// LOCKED: regression for packaging SVG Autocrop as a Git dependency
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = __dirname;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-git-test-"));

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, CI: "true", ...env },
  });
}

try {
  const sourceDir = path.join(tempDir, "source");
  const consumerDir = path.join(tempDir, "consumer");
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(consumerDir);

  fs.copyFileSync(path.join(root, "package-lock.json"), path.join(sourceDir, "package-lock.json"));
  fs.copyFileSync(path.join(root, "index.js"), path.join(sourceDir, "index.js"));
  fs.cpSync(path.join(root, "scripts"), path.join(sourceDir, "scripts"), { recursive: true });

  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  fs.writeFileSync(
    path.join(sourceDir, "package.json"),
    JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
      main: "index.js",
      scripts: {
        prepare: "node -e \"require('fs').writeFileSync(process.env.PREPARE_MARKER, 'yes')\"",
        prepack: packageJson.scripts.prepack,
        postpack: packageJson.scripts.postpack,
      },
    }),
  );
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ name: "git-dependency-consumer", version: "1.0.0", private: true }),
  );

  for (const args of [
    ["init", "--quiet"],
    ["config", "user.name", "Test User"],
    ["config", "user.email", "test@example.invalid"],
    ["add", "."],
    ["commit", "--quiet", "-m", "fixture"],
  ]) {
    const result = run("git", args, sourceDir);
    assert.strictEqual(result.status, 0, result.stderr);
  }

  const installResult = run(
    "npm",
    ["install", "--no-audit", "--no-fund", `git+file://${sourceDir}`],
    consumerDir,
    { PREPARE_MARKER: path.join(tempDir, "prepare-ran") },
  );
  assert.strictEqual(installResult.status, 0, `${installResult.stdout}\n${installResult.stderr}`);
  assert(fs.existsSync(path.join(tempDir, "prepare-ran")));
  const installedPath = path.join(consumerDir, "node_modules", packageJson.name);
  assert(fs.existsSync(path.join(installedPath, "index.js")));

  const noLockDir = path.join(tempDir, "no-lock");
  fs.mkdirSync(noLockDir);
  fs.writeFileSync(
    path.join(noLockDir, "package.json"),
    JSON.stringify({
      name: packageJson.name,
      version: "1.0.0",
      scripts: { prepack: packageJson.scripts.prepack },
    }),
  );
  fs.cpSync(path.join(root, "scripts"), path.join(noLockDir, "scripts"), { recursive: true });
  const noLockResult = run("npm", ["pack", "--dry-run", "--json", "--silent"], noLockDir);
  assert.notStrictEqual(noLockResult.status, 0);
  assert.match(`${noLockResult.stdout}\n${noLockResult.stderr}`, /Cannot package without package-lock\.json or npm-shrinkwrap\.json/);
  assert(!fs.existsSync(path.join(noLockDir, "npm-shrinkwrap.json")));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
