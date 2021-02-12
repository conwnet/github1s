# How it works

Github1s is based [VS Code 1.52.1](https://github.com/microsoft/vscode/tree/1.52.1) now. VS Code can be built for a browser version officially, I also used the code and inspired by [Code Server](https://github.com/cdr/code-server).

Thanks to very powerful, flexible extensibility of VS Code, we can easy to implements a VS Code extension that provide the custom File IO ability use [FileSystemProvider API](https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider). There is an official demo named [vscode-web-playground](https://github.com/microsoft/vscode-web-playground) show how it used.

On the other hand, GitHub provided the powerful [REST API](https://docs.github.com/en/rest) that can be work for a variety of tasks, includes read directories and files, sure.

According to the above, obviously, the core concepts of GitHub1s is implementing an VS Code Extension (includes FileSystemProvider) use GitHub REST API.

*We may switch to the GitHub GraphQL API for more friendly user experience in the future, thanks to @xcv58 and @kanhegaonkarsaurabh, see detail at [Issue 12](https://github.com/conwnet/github1s/issues/12).*

GitHub1s is pure static web app (Because it really doesn't need a backend service, does it?). So we just deploy it on [GitHub Pages](https://pages.github.com/) now (the `gh-pages` branch of this repository), and it is free. The service of GitHub1s could be reliable (GitHub is very reliable) because nobody need to pay for a host bill.

# Rate Limit

Another thing that need attention is [Rate Limit](https://docs.github.com/en/rest/reference/rate-limit):

> For unauthenticated requests, the rate limit allows for up to 60 requests per hour. Unauthenticated requests are associated with the originating IP address, and not the user making requests.

> For API requests using Basic Authentication or OAuth, you can make up to 5,000 requests per hour.

So, if you met some problems when you use github1s, even you are using newer browsers, you could try to set a [GitHub OAuth Token](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#oauth2-token-sent-in-a-header). Don't worry, we won't store your token, it will only store in your browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) with [VS Code Extension globalState API](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext) (Actually we don’t have a server, do we?).

But this does not mean the token is absolutely safe, **don't forget clean it while you are using a device doesn't belong to you**.

# Development

As you see, run the GitHub1s locally is not difficult, after cloning the repository, just run these commands:

```shell
$ yarn
$ yarn watch # or yarn build, it may take minutes, wait please
```

Then, there are a new directory named `dist` will be generated in project root. You can run `yarn serve` in other shell, it will create a static file server for dist directory.

Now you can visit http://localhost:5000 in browser. If you got a 404 error for some static files, please wait a minute for building completed.

## Watch Mode

What happened after you run `yarn watch`?

1. Copy some necessary resources (index.html, extensions config, libraries, etc.) to `dist` directory.

2. Entry in to `lib/vscode` and run `yarn gulp compile-web` to build the necessary extensions, then copy it to `dist/extensions` dictionary.

3. Entry in to `lib/vscode` directory and run `yarn watch` (the native watch of vscode), it will trigger a new build if something in it has been changed.

4. Watch the `src` directory, merge it in to `lib/vscode/src` directory if something in it has been changed. (When a new file merge into `lib/vscode/src` directory, it will trigger the watcher that described in step 3)

5. Entry in to `extensions/github1s` and run `yarn watch`, it will trigger a new build if something has been changed.

6. Watch the `extensions` directory and the `lib/vscode/out` directory, merge them into `dist` directory if something changed in them.

Note we have modified the source code of vscode, it may met trouble when merge a newer version vscode.

This is a little laborious to complete the watch process, but I  I didn't think of a better solution.

## Build mode

Put simply, we built the necessary code and do a minify. The minify script is modified from [Code Server](https://github.com/cdr/code-server).

## Directory Structure

- extensions - custom vscode extensions that don't include by vscode natively.

- src - the code in here will be patched into vscode source.

- scripts - some scripts for build, watch, package, etc.

- resources - some resources file such as templates, pictures, configuration file, etc.
