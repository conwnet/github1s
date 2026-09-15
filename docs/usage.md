# Using GitHub1s

[Documentation](guide.md) · [AI guide](ai.md)

GitHub1s opens remote repositories in a VS Code interface in your browser. Public repositories can be browsed without signing in, subject to the upstream services' access and rate limits.

## Open a repository or package

For GitHub, add `1s` after `github` in the address bar. For GitLab or npm, add `1s` after `gitlab` or `npmjs`.

| Source            | Example                                  |
| ----------------- | ---------------------------------------- |
| GitHub repository | `https://github1s.com/microsoft/vscode`  |
| GitLab repository | `https://gitlab1s.com/gitlab-org/gitlab` |
| npm package       | `https://npmjs1s.com/package/lodash`     |

Opening [GitHub1s without a repository path](https://github1s.com) displays repository collections from GitHub Discovery. Within a repository, use **GitHub1s: Open Repository...** in the Command Palette and enter a repository name such as `owner/repo` for the current platform. Use the browser address bar for a complete URL.

### Links to files and changes

GitHub1s recognizes common repository URLs. Replace the placeholders below with a repository, branch, tag, commit, or request number:

| View                           | URL pattern                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| GitHub branch or directory     | `https://github1s.com/owner/repo/tree/ref/path`              |
| GitHub file and selected lines | `https://github1s.com/owner/repo/blob/ref/path#L10-L20`      |
| GitHub commit                  | `https://github1s.com/owner/repo/commit/sha`                 |
| GitHub pull request            | `https://github1s.com/owner/repo/pull/number`                |
| GitLab file                    | `https://gitlab1s.com/group/project/-/blob/ref/path`         |
| GitLab merge request           | `https://gitlab1s.com/group/project/-/merge_requests/number` |

For branches or tags, you can also run **GitHub1s: Checkout to...**. Its **Checkout detached** option accepts a ref directly. This changes the revision being browsed.

## Navigate code and history

- Use **Explorer** to browse files and directories, or **Go to File** to find a file by name.
- Use **Search** for text across the repository and the editor's **Find** action for the open file.
- Open **Source Control** to inspect **Commits**, **File History**, and **Code Reviews** where the platform supports them.
- Select a commit or pull/merge request to inspect its changed files and diffs.
- Run **GitHub1s: Toggle File Blame** to display revision information beside file lines where available.

Open the Command Palette with `F1`, `Ctrl+Shift+P`, or `Cmd+Shift+P` on macOS. Browser and operating-system shortcuts can take precedence.

For questions about the code, click **Toggle Secondary Side Bar** in the layout controls at the top of GitHub1s to open the AI panel, then follow the [AI setup guide](ai.md#configure-a-model).

## Authentication and private repositories

Use authentication to access private repositories or make authenticated API requests. The account or token must have access to the repository you want to open.

1. Open **Settings** in the left activity bar.
2. Choose **Connect to GitHub** or **Connect to GitLab**, then complete the authorization flow in the popup.
3. Alternatively, enter a token in **Manual Input AccessToken** and select **Submit**. **Create New AccessToken** opens the corresponding provider's token creation page.
4. After connecting, use **Validate** to check the token and reopen the repository if necessary.

### Token storage and requests

GitHub and GitLab tokens are stored separately in the browser's VS Code extension state. Authenticated repository requests send the relevant token to the repository provider. Two additional paths matter:

- OAuth callbacks exchange authorization codes for tokens on the site's server-side Functions.
- GitHub's REST code-search fallback sends the authorization header through the site's same-origin search proxy, which forwards it to GitHub.
- The above features are all Cloudflare Functions now, which you can review in the [functions](../functions/) directory

To remove a saved token, choose **Clear**, then **Confirm**, in Settings. This removes the browser's saved token. Revoke the token or application authorization in GitHub if you also want to withdraw its access at the provider.

## Search and code navigation

Repository-wide search relies on external services. For GitHub, **Prefer to use Sourcegraph API** in Settings enables an initial [Sourcegraph](https://sourcegraph.com/) attempt. Search then falls back to [searchcode](https://searchcode.com/) and, if needed, the [GitHub REST API](https://docs.github.com/en/rest/search/search#search-code) through the site's proxy.

Results depend on the service's repository coverage, indexed revision, permissions, and rate limits. In particular:

- The GitHub REST fallback uses default-branch search results; they can differ from the ref currently open in the editor.
- That fallback does not support regular-expression or multiline searches, and result positions derived from snippets can be approximate.
- GitHub definition, reference, and hover results depend on Sourcegraph availability and coverage.
- Successful file browsing does not guarantee that repository-wide search or symbol navigation is available, especially for private repositories.

Authentication can help with API access and rate limits, but each provider and endpoint applies its own limits. Follow the error's retry guidance rather than assuming a single request quota covers every feature.

## Capabilities and limits

| Area                      | Scope                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| GitHub and GitLab         | Read repository files and inspect supported history and code-review views                  |
| AI                        | Requires a configured model and API key; see [AI setup](ai.md)                             |
| npm                       | Browse published package files and versions                                                |
| Remote repository changes | Read-only; use the repository host or a development environment to edit and submit changes |
| Extensions                | Browser-compatible extensions; availability differs from desktop VS Code                   |

## Troubleshooting

| Symptom                                   | What to check                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A private repository does not open        | Validate the token, check repository access, and confirm the URL works on the provider's site                         |
| Requests are rate limited                 | Authenticate if appropriate, inspect the reported limit, and wait for the retry time                                  |
| Search is empty or fails while files load | Try a simple text query; check the selected ref and the service limitations above                                     |
| OAuth does not complete                   | Allow the authentication popup; on a self-hosted instance, check [OAuth configuration](deployment.md#configure-oauth) |
| AI cannot connect                         | Check the endpoint, model ID, API key, and browser access requirements in the [AI guide](ai.md#troubleshooting)       |

For an unresolved problem, [open an issue](https://github.com/conwnet/github1s/issues) with the repository URL, browser version, and steps to reproduce it. Remove credentials from any logs or screenshots you include.

## Browser shortcuts

The [community directory](community.md#third-party-projects) lists browser extensions and scripts. You can also save this JavaScript as a bookmark's URL to switch between GitHub and GitHub1s while preserving the repository path:

```javascript
javascript: (() => {
	const url = new URL(window.location.href);
	if (url.hostname === 'github.com') {
		url.hostname = 'github1s.com';
	} else if (url.hostname === 'github1s.com') {
		url.hostname = 'github.com';
	} else {
		return;
	}
	window.location.href = url.href;
})();
```
