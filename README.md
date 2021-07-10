![GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/logo.svg)

# github1s

One second to read GitHub code with VS Code.

## Usage

Just add `1s` after `github` and press `Enter` in the browser address bar for any repository you want to read.

For example, try it on the VS Code repo:

[https://github1s.com/microsoft/vscode](https://github1s.com/microsoft/vscode)

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/vs-code-github1s.png)

For browser extensions, see [Third-party Related Projects](https://github.com/conwnet/github1s#third-party-related-projects).

Or save the following code snippet as a bookmarklet, you can use it to quickly switch between github.com and github1s.com (GitHub markdown doesn't allow js links, so just copy it into a bookmark).

```
javascript: window.location.href = window.location.href.replace(/github(1s)?.com/, function(match, p1) { return p1 ? 'github.com' : 'github1s.com' })
```

### Develop in the cloud

To edit files, run Docker containers, create pull requests and more, click the "Develop your project on [Gitpod](https://www.gitpod.io)" button in the status bar. You can also open the Command Palette (default shortcut `Ctrl+Shift+P`) and choose `GitHub1s: Edit files in Gitpod`.

![Gitpod Status Bar](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/gitpod-statusbar.png)

## Documentation

- [How it works](https://github.com/conwnet/github1s/blob/master/docs/guide.md)
- [Roadmap](https://github.com/conwnet/github1s/projects/1)

## Enabling Private Repositories

If you want to view non-public repositories, you need to add an OAuth token. The token is stored only in your browser, and only send to GitHub when fetching your repository's files. Click on the icon near the bottom of the left-hand row of icons, and the dialog box will prompt you for it, and even take you to your GitHub settings page to generate one, if needed.

<img height="500px" src="https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/auth-token.png" />

## Screenshots

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/GitHub1sDemo1.gif)

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/demo.png)

## Development

### Cloud-based development

You can start an online development environment with [Gitpod](https://www.gitpod.io) by clicking the following button:

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/conwnet/github1s)

### Local development

```bash
git clone git@github.com:conwnet/github1s.git
cd github1s
yarn
yarn watch
yarn serve # in another shell
# Then visit http://localhost:5000 or http://localhost:5000/conwnet/github1s once the build is completed.
```

#### Local development with full VS Code build

You need [these prerequisites (the same ones as for VS Code)](https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites) for development with full VS Code build.
Please make sure you could build VS Code locally before the watch mode.

To verify the build:

```bash
cd github1s
yarn build:vscode
```

After the inital successful build, you could use the watch mode:

```bash
cd github1s
yarn
yarn watch-with-vscode
yarn serve # in another shell
# Then visit http://localhost:5000 or http://localhost:5000/conwnet/github1s once the build is completed.
```

### ... or ... VS Code + Docker Development

You can use the VS Code plugin [Remote-Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) `Dev Container` to use a Docker container as a development environment.

1. Install the Remote-Containers plugin in VS Code & Docker
2. Open the Command Palette (default shortcut `Ctrl+Shift+P`) and choose `Remote-Containers: Clone Repository in Container Volume...`
3. Enter the repo, in this case `https://github.com/conwnet/github1s.git` or your forked repo
4. Pick either, `Create a unique volume` or `Create a new volume`

   - Now VS Code will create the docker container and connect to the new container so you can use this as a fully setup environment!

5. Open a new VS Code Terminal, then you can run the `yarn` commands listed above.

```bash
yarn
yarn watch
yarn serve # in another shell
# Then visit http://localhost:5000 or http://localhost:5000/conwnet/github1s once the build is completed.
```

### Format all codes

```bash
yarn format
```

It uses `prettier` to format all possible codes.

## Build

```bash
yarn
yarn build
```

## Feedback

- If something is not working, [create an issue](https://github.com/conwnet/github1s/issues/new)

- If you have a question, [discuss on gitter](https://gitter.im/conwnet/github1s)

## Project Sponsors

The continued development and maintenance of GitHub1s is made possible by these generous sponsors:

<table><tbody><tr>
<td><a href="https://sourcegraph.com/">
<img height="40px" src="https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/sourcegraph-logo.svg">
</a></td>
<td><a href="https://vercel.com/?utm_source=vscode-github1s&utm_campaign=oss">
<img height="40px" src="https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/vercel-logo.svg">
</a></td>
</tr></tbody></table>

## Third-party Related Projects

### Chrome Extensions

- [Repositree](https://chrome.google.com/webstore/detail/repositree/lafjldoccjnjlcmdhmniholdpjkbgajo) ([chouglesaud/repositree](https://github.com/chouglesaud/repositree))
- [Open in VS Code](https://chrome.google.com/webstore/detail/open-in-vs-code-github1sc/neloiopjjeflfnecdlajhopdlojlkhll) by [zulhfreelancer](https://github.com/zulhfreelancer)
- [GitHub1s](https://chrome.google.com/webstore/detail/github1s/lodjfmkfbfkpdhnhkcdcoonghhghbkhe) ([fhefh2015/GitHub1s_chrome_extension](https://github.com/fhefh2015/GitHub1s_chrome_extension))
- [github-code-viewer](https://chrome.google.com/webstore/detail/github-code-viewer/ecddapgifccgblebfibdgkagfbdagjfn) ([febaoshan/edge-extensions-github-code-viewer](https://github.com/febaoshan/edge-extensions-github-code-viewer))
- Github1s Extension ([Darkempire78/GitHub1s-Extension](https://github.com/Darkempire78/GitHub1s-Extension))
- [Github Web IDE](https://chrome.google.com/webstore/detail/adjiklnjodbiaioggfpbpkhbfcnhgkfe) ([zvizvi/Github-Web-IDE](https://github.com/zvizvi/Github-Web-IDE))
- [shortcut to github1s](https://chrome.google.com/webstore/detail/shortcut-to-github1s/gfcdbodapcbfckbfpmgeldfkkgjknceo) ([katsuhisa91/github1s-shortcut](https://github.com/katsuhisa91/github1s-shortcut))
- [Github1s Shortut - Open source](https://github.com/Fauzdar1/Github1s) 

### Firefox Extensions

- [Repositree](https://addons.mozilla.org/en-US/firefox/addon/repositree/) ([chouglesaud/repositree](https://github.com/chouglesaud/repositree))
- [Github1s Extension](https://addons.mozilla.org/firefox/addon/github1s-extension) ([Darkempire78/GitHub1s-Extension](https://github.com/Darkempire78/GitHub1s-Extension))
- [Github1s](https://addons.mozilla.org/firefox/addon/github1s/) ([mcherifi/github1s-firefox-addon](https://github.com/mcherifi/github1s-firefox-addon))
- [Github Web IDE](https://addons.mozilla.org/firefox/addon/github-web-ide/) ([zvizvi/Github-Web-IDE](https://github.com/zvizvi/Github-Web-IDE))

### Microsoft Edge Extensions

- [github-code-viewer](https://microsoftedge.microsoft.com/addons/detail/githubcodeviewer/jaaaapanahkknbgdbglnlchbjfhhjlpi) ([febaoshan/edge-extensions-github-code-viewer](https://github.com/febaoshan/edge-extensions-github-code-viewer))
- [Github Web IDE](https://microsoftedge.microsoft.com/addons/detail/akjbkjciknacicbnkfjbnlaeednpadcf) ([zvizvi/Github-Web-IDE](https://github.com/zvizvi/Github-Web-IDE))

### Safari Extension

- [GitHub1s-For-Safari-Extension](https://apps.apple.com/us/app/readcodeonline/id1569026520?mt=12) ([code4you2021/GitHub1s-For-Safari-Extension](https://github.com/code4you2021/GitHub1s-For-Safari-Extension))

### Tampermonkey scripts

- [Mr-B0b/TamperMonkeyScripts/vscode.js](https://github.com/Mr-B0b/TamperMonkeyScripts/blob/main/vscode.js)

## Maintainers! :blush:

<table>
  <tbody><tr>
    <td align="center"><a href="https://github.com/conwnet"><img alt="" src="https://avatars.githubusercontent.com/conwnet" width="100px;"><br><sub><b>netcon</b></sub></a><br><a href="https://github.com/conwnet/github1s/commits?author=conwnet" title="Code">💻 🖋</a></td> </a></td>
    <td align="center"><a href="https://github.com/xcv58"><img alt="" src="https://avatars.githubusercontent.com/xcv58" width="100px;"><br><sub><b>xcv58</b></sub></a><br><a href="https://github.com/conwnet/github1s/commits?author=xcv58" title="Code">💻 🖋</a></td></a></td>
    <td align="center"><a href="https://github.com/Siddhant-K-code"><img alt="" src="https://avatars.githubusercontent.com/Siddhant-K-code" width="100px;"><br><sub><b>Siddhant Khare</b></sub></a><br><a href="https://github.com/conwnet/github1s/commits?author=Siddhant-K-code" title="Code">💻 🖋</a></td> </a></td>
  </tr>
</tbody></table>

## Stargazers over time

[![Stargazers over time](https://starchart.cc/conwnet/github1s.svg)](https://starchart.cc/conwnet/github1s)
