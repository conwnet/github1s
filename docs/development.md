# Development

[Documentation](guide.md) · [Architecture](architecture.md) · [Deployment](deployment.md)

Most changes to GitHub1s use the published VS Code web package. Build VS Code locally when changing the editor source overlays under `vscode-web/`.

## Prerequisites

- Git and npm.
- Node.js 24, matching the repository's CI configuration.
- A browser for testing the application.

The commands below assume a Unix-compatible shell. Run them from the repository root unless a different working directory is shown.

## Run locally

```bash
git clone https://github.com/conwnet/github1s.git
cd github1s
npm install
npm run watch
```

The install step also installs dependencies for the local extensions. Watch mode starts webpack's development server and the repository and AI extension watchers.

Wait for the application and both extensions to finish compiling, then open [localhost:8080/conwnet/github1s](http://localhost:8080/conwnet/github1s). The development server uses port `8080` and writes generated assets to `dist/`.

OAuth callback Functions are not run by `npm run watch`; use a manually supplied token for repository authentication or follow the [Pages development instructions](deployment.md#preview-pages-functions-locally).

## Build the application

```bash
npm run build
```

This compiles the local extensions and produces the application in `dist/`. See the [deployment guide](deployment.md) for hosting the assets and enabling the accompanying Functions.

## Check changes

Choose checks for the part of the project you changed:

| Command                                             | Coverage                                        |
| --------------------------------------------------- | ----------------------------------------------- |
| `npm run eslint:check`                              | Repository lint checks, without automatic fixes |
| `npm run typecheck`                                 | Root application and Pages Functions            |
| `npm --prefix extensions/github1s run test`         | Repository extension tests                      |
| `npm --prefix extensions/github1s-ai run typecheck` | AI extension and webview types                  |
| `npm --prefix extensions/github1s-ai run test`      | AI extension tests                              |
| `npm run build`                                     | Production compilation and packaging            |

For browser integration tests, build the application first, stop any server already using port `8080`, then run:

```bash
npm run build
npm run test:ci
```

The test command starts the development server, installs the test dependencies and Playwright browsers, and runs the Jest browser suite. The existing tests launch Chromium, exercise repository loading and navigation, and depend on external repository services.

`npm run format` formats the whole repository, and `npm run eslint` applies lint fixes. To format only a documentation change, pass the changed files to Prettier:

```bash
npx prettier --write README.md docs/usage.md
```

## Develop with a local VS Code build

This workflow requires the native build tools used by the pinned VS Code revision. Follow the [VS Code package guide](../vscode-web/README.md) for upstream prerequisites and overlay maintenance.

Install and build the companion package:

```bash
npm install
cd vscode-web
npm install
npm run build
cd ..
npm run link
```

The package build clones VS Code and its localization repository, applies the overlays, compiles the editor, and writes `vscode-web/dist/`. The link command makes the root application use that package.

Run the VS Code watchers in one terminal:

```bash
cd vscode-web
npm run watch
```

Run the application and extension watchers from the repository root in another terminal:

```bash
npm run watch-with-vscode
```

Wait for both terminals to finish their initial compilation, then open the same local application URL. In this mode, the development server serves editor assets from `vscode-web/lib/vscode/`.

To test a production build using the locally built package, run `npm run build` from the repository root after building and linking `vscode-web`.

## Where to make changes

| Change                                                     | Location                        |
| ---------------------------------------------------------- | ------------------------------- |
| Application startup, workspace selection, or browser OAuth | `src/`                          |
| Repository access, routing, history, or search             | `extensions/github1s/src/`      |
| AI chat, model connections, context, or tools              | `extensions/github1s-ai/src/`   |
| VS Code behavior modified by GitHub1s                      | `vscode-web/src/`               |
| OAuth callback or GitHub search proxy                      | `functions/`                    |
| Repository discovery collections or snapshots              | `workers/discovery/`            |
| Build and packaging behavior                               | `scripts/`, `webpack.config.js` |

See the [architecture guide](architecture.md) for how these components fit together.

## Troubleshooting

- **Missing files during startup:** check that both extension watchers and webpack have completed compilation, then reload the browser.
- **OAuth fails locally:** the webpack server does not host the OAuth callbacks. Use a token or the Pages preview workflow.
- **Changes to VS Code do not appear:** use the two-terminal workflow above and edit the overlays under `vscode-web/src/`.
- **A root type check passes but AI code fails:** the AI extension has its own type checks; run its `typecheck` script.
