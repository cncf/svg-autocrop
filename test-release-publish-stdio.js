// LOCKED: regression for interactive npm publish authentication
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-publish-stdio-test-"));
const binDir = path.join(tempDir, "bin");
const npmPath = path.join(binDir, "npm");
const inputPath = path.join(tempDir, "publish-stdin");

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
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    fs.writeFileSync(process.env.TEST_PUBLISH_INPUT, input);
    console.log("publish stdout marker");
    console.error("publish stderr marker");
    process.exit(input === "auth-code" ? 0 : 2);
  });
  return;
}
process.exit(3);
`,
);
fs.chmodSync(npmPath, 0o755);

function runPublish() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts", "package-release.js"), "publish", "--dry-run"],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
          TEST_PUBLISH_INPUT: inputPath,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 30000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    });
    child.stdin.end("auth-code");
  });
}

runPublish()
  .then(({ status, stdout, stderr }) => {
    assert.strictEqual(status, 0, `${stdout}\n${stderr}`);
    assert.match(stdout, /publish stdout marker/);
    assert.match(stderr, /publish stderr marker/);
    assert.strictEqual(fs.readFileSync(inputPath, "utf8"), "auth-code");
  })
  .finally(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
