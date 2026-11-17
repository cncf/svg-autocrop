# Copilot instructions

Guidance for AI coding agents working in this repository.

`svg-autocrop` crops SVGs to a consistent border and strips extraneous markup.
It optimizes the markup with svgo, renders it to a bitmap in headless Chrome
(Puppeteer) to find the bounding box, and rewrites the `viewBox`. The
[CNCF Landscape](https://landscape.cncf.io) depends on it, so any change in
output changes real logos. Every change must be tested.

## The test suite

`npm test` runs `test.js`, a golden-file suite. Each `fixtures/<name>.input.svg`
must produce either `<name>.output.svg` (same markup, `viewBox` within
tolerance) or the exact message in `<name>.error.txt`. Use `MATCH=<name> npm test`
to run a subset.

These fixtures are the characterization tests for `index.js`. Protect them:

- **Never re-capture fixtures to make a failing test pass.** `CAPTURE=1`
  overwrites expected output with whatever the code produces now. Use it only
  for fixtures whose output you intend to change, scope it with `MATCH`, review
  the `fixtures/` diff (including exact error-text baselines), and list every
  changed fixture in the PR. `compare.html` shows input beside current output;
  use it as an additional visual check, not as a before-and-after comparison.
- `npm test` rewrites `compare.html`. Do not commit that change unless you added
  or removed fixtures.

## Changing existing code

Follow Martin Fowler's *Refactoring: Improving the Design of Existing Code*.

- **Tests first.** Before changing code, confirm tests cover the behavior you
  are touching. If they don't, add characterization tests (a fixture or a unit
  test that pins current behavior) before changing anything.
- **Two hats.** A change either refactors (structure only) or changes behavior,
  never both in one commit. A refactor leaves `fixtures/` untouched.
- **Small steps.** Run the tests after each step.
- **Name it.** State the smell and the refactoring you apply (for example,
  Extract Function, Rename Variable, Move Function).

## New code

Greenfield work is test-driven: red, green, refactor.

1. Write a failing unit test for the next small piece of behavior.
2. Write the minimum code to make it pass.
3. Refactor with the tests green, then repeat.

No production code without a failing test driving it. Behavior visible in the
rendered output also needs a fixture.

Write unit tests with Node's built-in runner (`node:test` and `node:assert`).
Don't add a test framework dependency without discussing it first.
Before relying on unit tests, ensure `npm test` runs them alongside the fixture
suite and that the Node versions used locally and in CI support the runner.

`index.js` exports only its entry point. To unit test a helper inside it, first
move the helper into its own module (Extract Function, Move Function) with the
fixture suite green, then test the module.

## Bug fixes

- **Fail first.** Reproduce the bug with a test (fixture or unit test) and
  confirm it fails before you fix it. A test that passes before the fix proves
  nothing.
- **Lock it.** Tag regression unit tests with a greppable comment naming the
  fix: `// LOCKED: regression for <issue/PR>`. Never edit, weaken, skip, or
  delete a locked test without maintainer approval. Add new tests alongside
  instead.
