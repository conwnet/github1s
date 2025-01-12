# @github1s/vscode-web

This is the companion NPM package to support GitHub1s. The NPM package is [@github1s/vscode-web](https://www.npmjs.com/package/@github1s/vscode-web).

## Commands

`npm run clone` - clone the official VS Code repo.

`npm run build` - build the VS Code with the custom code under `src`.

`npm run watch` - watch the code change under `src` directory and rebuild VS Code.

## Usage

The codes in the package can be used independently, See [index.html](./index.html).

## Publish

To publish the NPM package, please make sure you have the right access via https://www.npmjs.com/ and run the following commands:

```sh
# bump the `version` field in package.json file.
npm run build && cd dist
npm publish --access public
```
