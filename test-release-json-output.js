// LOCKED: regression for JSON output from npm release publishing
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = __dirname;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-json-test-"));
const binDir = path.join(tempDir, "bin");
const npmPath = path.join(binDir, "npm");

try {
  fs.mkdirSync(binDir);
  fs.writeFileSync(
    npmPath,
    `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);

if (args[0] === "shrinkwrap") {
  process.exit(0);
}
if (args[0] === "pack") {
  const destination = args.find((arg) => arg.startsWith("--pack-destination=")).slice(19);
  const filename = "svg-autocrop-2.0.41.tgz";
  fs.writeFileSync(path.join(destination, filename), "test tarball");
  process.stdout.write(JSON.stringify([{ filename, id: "svg-autocrop@2.0.41" }]));
  process.exit(0);
}
if (args[0] === "publish") {
  process.stdout.write(JSON.stringify({ ok: true }));
  process.exit(0);
}
process.exit(3);
`,
  );
  fs.chmodSync(npmPath, 0o755);

  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "package-release.js"), "publish", "--dry-run", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH}` },
    },
  );

  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepStrictEqual(JSON.parse(result.stdout), { ok: true });
  assert.match(result.stderr, /Dry run completed for svg-autocrop@2\.0\.41/);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
