# Contributing

Thanks for taking a look. This is a small library with a deliberately small
surface, so most of the work here is keeping it that way.

## Getting started

```bash
npm ci
npm test
```

Node 20 or newer.

## Scripts

| Script                  | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run build`         | Bundles ESM + CJS + declarations into `dist/`              |
| `npm run dev`           | Same, in watch mode                                        |
| `npm test`              | Runs the test suite once                                   |
| `npm run test:watch`    | Runs the tests in watch mode                               |
| `npm run test:coverage` | Runs the tests and reports coverage                        |
| `npm run lint`          | Lints with oxlint                                          |
| `npm run format`        | Formats with oxfmt                                         |
| `npm run format:check`  | Checks formatting without writing                          |
| `npm run typecheck`     | Type-checks without emitting                               |
| `npm run pack:local`    | Builds and packs a tarball for local install               |
| `npm run demo:install`  | Installs the demo's dependencies (once)                    |
| `npm run demo`          | Builds the library, then serves the demo at localhost:5173 |

Before opening a pull request:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

## Commit and pull request titles

Pull requests are squash-merged, so **the pull request title becomes the commit
subject on `main`** — and that is what Release Please reads to build the
changelog. Titles must follow
[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add a keyboard fallback for the drag handle
fix: clear the active drag when a drag is cancelled
docs: explain the drag group model
chore(deps): bump vitest
```

`feat:` bumps the minor version, `fix:` the patch. A `!` suffix or a
`BREAKING CHANGE:` footer bumps the major. A CI check enforces the format.

## Releasing

Merging to `main` opens or updates a release pull request. Merging _that_ tags a
GitHub Release and publishes the package, both in the same workflow run. It goes
to npm with [Trusted Publishing](https://docs.npmjs.com/trusted-publishers), so
no npm token is stored in this repository.

Publishing runs in the same workflow run that cuts the release rather than from
a separate `on: release` trigger. That is deliberate: a release created with the
built-in `GITHUB_TOKEN` does not cascade into further workflow runs, so a
separate trigger would never fire and a personal access token would be needed to
work around it.

That same rule shows up one more time, on the release pull request itself. Its
checks are created but **held**, in GitHub's `action_required` state, waiting for
a maintainer. Approve them from the "Checks" section of the release pull request
— there is a button there. Note that `gh pr checks` reports _nothing at all_ for
held runs, which reads exactly like "no checks were created"; it isn't.

Two things about the npm side are worth knowing before changing anything:

- The trusted publisher on npmjs.com must name **`release-please.yml`**, not
  `publish.yml`. `publish.yml` is a reusable workflow, and npm validates the OIDC
  claim against the _calling_ workflow. Getting this wrong fails the publish with
  a misleading `E404` long after provenance has already been signed.
- The `npm-publish` environment name must match what the publisher config says.

## Design constraints

Three rules shape most review feedback here:

1. **Zero runtime dependencies.** React is a peer dependency; nothing else ships.
   That includes icon libraries — the default drag handle is an inline SVG, and
   anything richer is the consumer's to pass in.
2. **Headless.** No stylesheet ships, and no class names are baked in. State is
   exposed through `data-*` attributes so any CSS approach can target it.
3. **Nothing application-specific.** No product names, no brand colours, no
   domain types. A test enforces this; if something only makes sense for one
   application, it belongs in that application.
