![GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/logo.png)
# github1s

One second to read GitHub code with VS Code.

[Chrome Extension](https://chrome.google.com/webstore/detail/github1s/lodjfmkfbfkpdhnhkcdcoonghhghbkhe/)

[Bookmarklet (drag me to your browser's bookmark toolbar](javascript:(function()%7Bwindow.location.href%20%3D%20window.location.href.replace('github.com'%2C%20'github1s.com')%7D)())

## Usage

Just add `1s` after `github` and press `Enter` in browser address bar for any repository you want to read.

For Example VS Code:

[https://github1s.com/microsoft/vscode](https://github1s.com/microsoft/vscode)

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/vs-code-github1s.png)

## Demo

![VS Code - GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/demo.png)

## Development

You need [these prerequisites as same as VS Code](https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites) for development.

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

