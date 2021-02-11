![GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/logo.png)
# github1s

One second to read GitHub code with VS Code.

[Chrome Extension](https://chrome.google.com/webstore/detail/github1s/lodjfmkfbfkpdhnhkcdcoonghhghbkhe/)

Or Save as a bookmarklet (GitHub markdown doesn't allow js links, just copy it into a bookmark)

```
javascript: window.location.href = window.location.href.replace('github.com', 'github1s.com')
```

## Usage

Just add `1s` after `github` and press `Enter` in browser address bar for any repository you want to read.

For Example VS Code:

[https://github1s.com/microsoft/vscode](https://github1s.com/microsoft/vscode)

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/vs-code-github1s.png)

## Documentation

- [How it works](https://github.com/conwnet/github1s/blob/master/docs/guide.md)

## Screenshots

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/demo.png)

## Development

You need [these prerequisites the same as VS Code](https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites) for development.

```bash
$ git clone git@github.com:conwnet/github1s.git
$ cd github1s
$ yarn
$ yarn watch
$ yarn serve # in another shell
$ # Then visit http://localhost:5000 or http://localhost:5000/conwnet/github1s once the build is completed.
```

## Build

```bash
$ yarn
$ yarn build
```

