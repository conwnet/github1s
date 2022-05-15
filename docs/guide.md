# How it works

GitHub1s is based on [VS Code 1.60.0](https://github.com/microsoft/vscode/tree/1.60.0) now. VS Code can be built for a browser version officially. I also used the code and got inspired by [Code Server](https://github.com/cdr/code-server).

Thanks to the very powerful and flexible extensibility of VS Code, we can easily implement a VS Code extension that provides the custom File IO ability using [FileSystemProvider API](https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider). There is an official demo named [vscode-web-playground](https://github.com/microsoft/vscode-web-playground) which shows how it is used.

On the other hand, GitHub provides the powerful [REST API](https://docs.github.com/en/rest) that can be used for a variety of tasks which includes reading directories and files for sure.

According to the above, obviously, the core concept of GitHub1s is to implement a VS Code Extension (includes FileSystemProvider) using GitHub REST API.

_We may switch to the GitHub GraphQL API for more friendly user experience in the future, thanks to @xcv58 and @kanhegaonkarsaurabh. See details at [Issue 12](https://github.com/conwnet/github1s/issues/12)._

~~GitHub1s is a purely static web app (because it really doesn't need a backend service, does it?). So we just deploy it on [GitHub Pages](https://pages.github.com/) now (the `gh-pages` branch of this repository), and it is free. The service of GitHub1s could be reliable (GitHub is very reliable) because nobody needs to pay the web hosting bills.~~

We deploy GitHub1s on [Vercel](https://vercel.com/) now for minimize delays in loading and better developer experience. Thanks for the wonderful service provide by Vercel.

# Rate Limit

Another thing that needs attention is [Rate Limit](https://docs.github.com/en/rest/reference/rate-limit):

> For unauthenticated requests, the rate limit allows for up to 60 requests per hour. Unauthenticated requests are associated with the originating IP address, and not the user making requests.

> For API requests using Basic Authentication or OAuth, you can make up to 5,000 requests per hour.

So, if you meet some problems when you use GitHub1s, even if you are using newer browsers, you could try to set a [GitHub OAuth Token](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#oauth2-token-sent-in-a-header). Don't worry, we cannot see your token. It is only stored in your browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) with [VS Code Extension globalState API](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext) (Actually we don't have a server, do we?).

But this does not mean the token is absolutely safe, **don't forget to clean it while you are using a device that doesn't belong to you**.

# Development

As you see, running GitHub1s locally is not difficult. After cloning the repository, just run these commands:

```shell
$ yarn
$ yarn watch # or yarn build, it may take minutes, wait please
```

Then, there will be a new directory named `dist` generated in the project root. You can run `yarn serve` in another shell, and it will create a static file server for the `dist` directory.

Now you can visit http://localhost:5000 in the browser. If you get a 404 error for some static files, please wait a minute for the building to complete.

## Watch Mode

What happens after you run `yarn watch-with-vscode`?

1. Copy some necessary resources (`index.html`, extensions config, libraries, etc.) to the `dist` directory.

2. Go to `vscode-web/lib/vscode` and run `yarn gulp compile-web` to build the necessary extensions, then copy it to the `dist/extensions` directory.

3. Go to `vscode-web/lib/vscode` and run `yarn watch` (the native watch of vscode), it will trigger a new build if something in it has been changed.

4. Watch the `vscode-web/src` directory, merge it in to `vscode-web/lib/vscode/src` if something in it has been changed. (When a new file is merged into `lib/vscode/src`, it will trigger the watcher that is described in Step 3)

5. Go to `extensions/github1s` and run `yarn watch`, it will trigger a new build if something has been changed.

6. Watch the `extensions` directory and the `lib/vscode/out` directory, merge them into the `dist` directory if something changed in them.

Note that since we have modified the source code of VS Code, it may get into trouble when merging a newer version VS Code.

It is a little laborious to complete the watch process, but I didn't think of a better solution.

What happens after you run `yarn watch`?

It's the same procedure as `yarn watch-with-vscode` without the step 2, 3, and 4. Instead of the local VS Code, it uses the prebuilt [@github1s/vscode-web](https://www.npmjs.com/package/@github1s/vscode-web) version.

## Build mode

Put simply, we build the necessary code and do a minify. The minify script is modified from [Code Server](https://github.com/cdr/code-server).

## Directory Structure

- `extensions` - custom VS Code extensions that don't come with VS Code natively.

- `src` - the code in here will be patched into VS Code source.

- `scripts` - some scripts for build, watch, package, etc.

- `resources` - some resource files such as templates, pictures, configuration files, etc.
