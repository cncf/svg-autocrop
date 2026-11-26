// LOCKED: regression for isolated npm packaging and repacking shrinkwrapped archives
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = __dirname;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-autocrop-pack-test-"));
const outputDir = path.join(tempDir, "output");
const extractedDir = path.join(tempDir, "extracted");
const tempRoot = path.join(tempDir, "staging");
const lockPath = path.join(root, "package-lock.json");
const lockBefore = fs.readFileSync(lockPath);

fs.mkdirSync(outputDir);
fs.mkdirSync(extractedDir);
fs.mkdirSync(tempRoot);

function runNpm(args, env = {}) {
  return spawnSync("npm", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    env: {
      ...process.env,
      CI: "true",
      TMPDIR: tempRoot,
      NO_PROXY: `${process.env.NO_PROXY || ""},127.0.0.1,localhost`,
      no_proxy: `${process.env.no_proxy || ""},127.0.0.1,localhost`,
      ...env,
    },
  });
}

function runNpmAsync(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", args, {
      cwd: root,
      env: {
        ...process.env,
        CI: "true",
        TMPDIR: tempRoot,
        NO_PROXY: `${process.env.NO_PROXY || ""},127.0.0.1,localhost`,
        no_proxy: `${process.env.no_proxy || ""},127.0.0.1,localhost`,
        ...env,
      },
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 30000);

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
  });
}

function assertSourceLockUnchanged() {
  assert(fs.readFileSync(lockPath).equals(lockBefore));
  assert(!fs.existsSync(path.join(root, "npm-shrinkwrap.json")));
}

function assertStagingClean() {
  const leftovers = fs.readdirSync(tempRoot).filter((entry) => entry.startsWith("svg-autocrop-package-"));
  assert.deepStrictEqual(leftovers, []);
}

async function runTests() {
  const registryRequests = [];
  const registry = http.createServer((request, response) => {
    registryRequests.push({ method: request.method, url: request.url });
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "test registry unavailable" }));
  });

  await new Promise((resolve) => registry.listen(0, "127.0.0.1", resolve));
  const { port } = registry.address();
  const registryUrl = `http://127.0.0.1:${port}/`;
  const userConfig = path.join(tempDir, "npmrc");
  fs.writeFileSync(userConfig, `//127.0.0.1:${port}/:_authToken=test-token\n`);

  try {
    const packResult = runNpm([
      "run",
      "--silent",
      "pack:release",
      "--",
      `--pack-destination=${outputDir}`,
    ]);
    assert.strictEqual(packResult.status, 0, packResult.stderr);

    const packMetadata = JSON.parse(packResult.stdout)[0];
    const packedFiles = packMetadata.files.map((file) => file.path);
    assert(packedFiles.includes("npm-shrinkwrap.json"));
    assert(!packedFiles.includes("package-lock.json"));
    assertSourceLockUnchanged();
    assertStagingClean();

    const tarball = path.join(outputDir, packMetadata.filename);
    const extractResult = spawnSync("tar", ["-xzf", tarball, "-C", extractedDir], {
      encoding: "utf8",
    });
    assert.strictEqual(extractResult.status, 0, extractResult.stderr);

    const unpackedDir = path.join(extractedDir, "package");
    assert(!fs.existsSync(path.join(unpackedDir, "package-lock.json")));
    assert(fs.existsSync(path.join(unpackedDir, "npm-shrinkwrap.json")));
    const repackResult = spawnSync("npm", ["pack", "--dry-run", "--json", "--silent"], {
      cwd: unpackedDir,
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, CI: "true" },
    });
    assert.strictEqual(repackResult.status, 0, repackResult.stderr);
    assert(fs.existsSync(path.join(unpackedDir, "npm-shrinkwrap.json")));
    assert(!fs.existsSync(path.join(unpackedDir, "package-lock.json")));

    const blockedDestination = path.join(tempDir, "not-a-directory");
    fs.writeFileSync(blockedDestination, "blocked");
    const packFailure = runNpm([
      "run",
      "--silent",
      "pack:release",
      "--",
      `--pack-destination=${blockedDestination}`,
    ]);
    assert.notStrictEqual(packFailure.status, 0);
    assert.match(`${packFailure.stdout}\n${packFailure.stderr}`, /ENOTDIR|EEXIST/);
    assertSourceLockUnchanged();
    assertStagingClean();

    const publishFailure = await runNpmAsync(
      [
        "run",
        "--silent",
        "publish:release",
        "--",
        `--registry=${registryUrl}`,
        "--fetch-retries=0",
        "--fetch-timeout=2000",
      ],
      { NPM_CONFIG_USERCONFIG: userConfig },
    );
    assert.notStrictEqual(publishFailure.status, 0);
    assert.match(`${publishFailure.stdout}\n${publishFailure.stderr}`, /E503|test registry unavailable/);
    assert(registryRequests.some((request) => request.method === "PUT"));
    assertSourceLockUnchanged();
    assertStagingClean();
  } finally {
    await new Promise((resolve) => registry.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
