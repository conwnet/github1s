# Deployment

[Documentation](guide.md) · [Development](development.md) · [Architecture](architecture.md)

A GitHub1s deployment consists of static application assets and, for OAuth and the GitHub REST search fallback, server-side Functions. Cloudflare Pages can host both. Repository discovery uses a separate Worker.

## Deployment layout

| Part               | Location                | Purpose                                                         |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| Application assets | Build output in `dist/` | VS Code, extensions, and the web entry                          |
| Pages Functions    | Source in `functions/`  | OAuth callbacks and GitHub code-search proxy                    |
| Discovery Worker   | `workers/discovery/`    | Scheduled repository collections and their public JSON endpoint |

Serve the application at the root of an origin, such as `https://code.example.com`. Asset paths are absolute; deployment under a subdirectory requires code changes.

Custom hostnames select the GitHub platform by default. GitLab and npm selection currently depends on the hostname rules in [`src/index.ts`](../src/index.ts); adapt those rules when hosting either platform on your own domain.

## Configure OAuth

OAuth configuration is needed for the **Connect to GitHub** and **Connect to GitLab** buttons. Users can also supply repository tokens manually.

Create the corresponding OAuth application at the repository provider and register the callback on the same origin as GitHub1s:

| Provider | Callback URL                                        |
| -------- | --------------------------------------------------- |
| GitHub   | `https://code.example.com/api/github-auth-callback` |
| GitLab   | `https://code.example.com/api/gitlab-auth-callback` |

Replace the origin with your deployment's origin. Set the following variables for each provider you enable:

| Variable                   | Stage                       | Value                                    |
| -------------------------- | --------------------------- | ---------------------------------------- |
| `GITHUB_OAUTH_ID`          | Build and Functions runtime | GitHub OAuth application's client ID     |
| `GITHUB_OAUTH_SECRET`      | Functions runtime           | GitHub OAuth application's client secret |
| `GITHUB1S_ALLOWED_ORIGINS` | Functions runtime           | Comma-separated allowed origins          |
| `GITLAB_OAUTH_ID`          | Build and Functions runtime | GitLab application's client ID           |
| `GITLAB_OAUTH_SECRET`      | Functions runtime           | GitLab application's client secret       |
| `GITLAB1S_ALLOWED_ORIGINS` | Functions runtime           | Comma-separated allowed origins          |

Use the same client ID at build time and runtime. Allowed origins include the scheme and any port, with no path or trailing slash, for example `https://code.example.com,http://localhost:8788`. The callback checks its own request origin against this list and returns authorization to the browser on that origin.

Set client IDs in the environment before building; webpack does not load them from `.dev.vars` or `.env` automatically. Configure runtime values in the Pages project's variables and secrets for the target environment. Keep OAuth application secrets in the Functions runtime. See [Cloudflare's Functions bindings guide](https://developers.cloudflare.com/pages/functions/bindings/#secrets) for runtime secrets.

The repository also reads `GITHUB_DOMAIN`, `GITHUB_API_PREFIX`, `GITLAB_DOMAIN`, and `GITLAB_API_PREFIX` during builds. These customize some upstream URLs, but OAuth endpoints and the GitHub search proxy still target github.com and gitlab.com. Supporting an enterprise or self-managed provider requires reviewing those paths as well as platform selection.

## Build and deploy to Pages

Use the [development prerequisites](development.md#prerequisites). From the repository root, install dependencies and build with the client IDs for the providers you enabled:

```bash
npm install
export GITHUB_OAUTH_ID='your-github-client-id'
npm run build
```

Omit the export for a deployment without GitHub OAuth; set `GITLAB_OAUTH_ID` as well when enabling GitLab OAuth.

For a CLI deployment, authenticate with Cloudflare and create a Pages project if needed:

```bash
npx wrangler login
npx wrangler pages project create
```

Configure the project's runtime variables and secrets, then deploy:

```bash
npx wrangler pages deploy dist --project-name your-pages-project
```

Run this command from the repository root so Wrangler also compiles and uploads `functions/`. Uploading only `dist/` through the dashboard does not include these Functions. See [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/#functions).

With Pages Git integration, use the repository root as the build root, `npm run build` as the build command, and `dist` as the output directory. Set the Node version to the CI baseline documented in the development guide.

## Preview Pages Functions locally

Wrangler can run the built assets and Functions together. Prepare OAuth configuration before building or starting it if you want to test authentication.

For OAuth, provide the runtime variables in a root `.dev.vars` file. Before creating it, add `.dev.vars*` to your local `.git/info/exclude`; the repository's `.gitignore` does not currently cover it. An example for GitHub is:

```dotenv
GITHUB_OAUTH_ID=your-github-client-id
GITHUB_OAUTH_SECRET=your-github-client-secret
GITHUB1S_ALLOWED_ORIGINS=http://localhost:8788
```

Register `http://localhost:8788/api/github-auth-callback` with the OAuth application used for local testing. Then, from the repository root, export that application's client ID, rebuild, and start the preview:

```bash
export GITHUB_OAUTH_ID='your-github-client-id'
npm run build
npx wrangler pages dev dist
```

Omit the OAuth configuration and export for a preview without GitHub OAuth. Open `http://localhost:8788/conwnet/github1s`. This differs from `npm run watch`, whose webpack server runs on port `8080` and only proxies GitHub code search. See [Pages local development](https://developers.cloudflare.com/pages/functions/local-development/) and [local secrets](https://developers.cloudflare.com/pages/functions/bindings/#local-development-with-secrets).

## Other static hosts

To serve the application assets on another host:

- Publish `dist/` at the origin root.
- Serve `index.html` for application routes such as `/owner/repo/blob/ref/path`, while serving real assets directly.
- Apply the response headers from [`public/_headers`](../public/_headers): `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`.
- Provide equivalent server routes for OAuth callbacks and `/api/github/search/code` if those features are required.

Pages supplies an [SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering) when no top-level `404.html` exists. Its [`_headers` rules](https://developers.cloudflare.com/pages/configuration/headers/) apply to static assets; Functions manage their own responses.

## Discovery service

The application reads Discovery from a URL defined in [`extensions/github1s/src/adapters/discovery/data-source.ts`](../extensions/github1s/src/adapters/discovery/data-source.ts). To use your own service, deploy the [Discovery Worker](../workers/discovery/README.md), update that URL, and rebuild the application.

## Verify the deployment

1. Open a public repository and read a file.
2. Reload a deep file URL to verify route fallback and asset paths.
3. If OAuth is enabled, connect an account and validate its token in Settings.
4. Check the `/api/github/search/code` route. Successful search through another service alone does not verify the GitHub fallback.
5. Open the home page and confirm Discovery loads from the intended endpoint.

AI model and MCP requests originate in the browser. Their connectivity depends on the endpoints configured by each user; see the [AI guide](ai.md).
