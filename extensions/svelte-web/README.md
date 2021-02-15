# This extension is a fork from [language-tools](https://github.com/sveltejs/language-tools) for github1s

# At present only languages features is reserved

# I have deleted some files and only reserved the necessary code

# Svelte for VS Code

Provides syntax highlighting and rich intellisense for Svelte components in VS Code.

## Setup

If you added `"files.associations": {"*.svelte": "html" }` to your VSCode settings, remove it.

If you have previously installed the old "Svelte" extension by James Birtles, uninstall it:

- Through the UI: You can find it when searching for `@installed` in the extensions window (searching `Svelte` won't work).
- Command line: `code --uninstall-extension JamesBirtles.svelte-vscode`

This extension comes bundled with a formatter for Svelte files. To let this extension format Svelte files, adjust your VS Code settings:

```
   "[svelte]": {
     "editor.defaultFormatter": "svelte.svelte-vscode"
   },
```

You need at least VSCode version `1.52.0`.

## Features

- Svelte
  - Diagnostic messages for warnings and errors
  - Support for svelte preprocessors that provide source maps
  - Svelte specific formatting (via [prettier-plugin-svelte](https://github.com/sveltejs/prettier-plugin-svelte))
  - A command to preview the compiled code (DOM mode): "Svelte: Show Compiled Code"
  - A command to extract template content into a new component: "Svelte: Extract Component"
- HTML
  - Hover info
  - Autocompletions
  - [Emmet](https://emmet.io/)
  - Symbols in Outline panel
- CSS / SCSS / LESS
  - Diagnostic messages for syntax and lint errors
  - Hover info
  - Autocompletions
  - Formatting (via [prettier](https://github.com/prettier/prettier))
  - [Emmet](https://emmet.io/)
  - Color highlighting and color picker
  - Symbols in Outline panel
- TypeScript / JavaScript
  - Diagnostics messages for syntax errors, semantic errors, and suggestions
  - Hover info
  - Formatting (via [prettier](https://github.com/prettier/prettier))
  - Symbols in Outline panel
  - Autocompletions
  - Go to definition
  - Code Actions

### Settings

##### `svelte.language-server.runtime`

Path to the node executable you would like to use to run the language server.
This is useful when you depend on native modules such as node-sass as without
this they will run in the context of vscode, meaning node version mismatch is likely.

##### `svelte.language-server.ls-path`

You normally don't set this. Path to the language server executable. If you installed the \"svelte-language-server\" npm package, it's within there at \"bin/server.js\". Path can be either relative to your workspace root or absolute. Set this only if you want to use a custom version of the language server.

##### `svelte.language-server.port`

You normally don't set this. At which port to spawn the language server.
Can be used for attaching to the process for debugging / profiling.
If you experience crashes due to "port already in use", try setting the port.
-1 = default port is used.

##### `svelte.plugin.typescript.enable`

Enable the TypeScript plugin. _Default_: `true`

##### `svelte.plugin.typescript.diagnostics.enable`

Enable diagnostic messages for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.hover.enable`

Enable hover info for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.documentSymbols.enable`

Enable document symbols for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.completions.enable`

Enable completions for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.findReferences.enable`

Enable find-references for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.definitions.enable`

Enable go to definition for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.codeActions.enable`

Enable code actions for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.selectionRange.enable`

Enable selection range for TypeScript. _Default_: `true`

##### `svelte.plugin.typescript.rename.enable`

Enable rename functionality for JS/TS variables inside Svelte files. _Default_: `true`

##### `svelte.plugin.typescript.signatureHelp.enable`

Enable signature help (parameter hints) for JS/TS. _Default_: `true`

##### `svelte.plugin.typescript.semanticTokens.enable`

Enable semantic tokens (semantic highlight) for TypeScript. Doesn't apply to JavaScript. _Default_: `true`

##### `svelte.plugin.css.enable`

Enable the CSS plugin. _Default_: `true`

##### `svelte.plugin.css.globals`

Which css files should be checked for global variables (`--global-var: value;`). These variables are added to the css completions. String of comma-separated file paths or globs relative to workspace root.

##### `svelte.plugin.css.diagnostics.enable`

Enable diagnostic messages for CSS. _Default_: `true`

##### `svelte.plugin.css.hover.enable`

Enable hover info for CSS. _Default_: `true`

##### `svelte.plugin.css.completions.enable`

Enable auto completions for CSS. _Default_: `true`

##### `svelte.plugin.css.completions.emmet`

Enable emmet auto completions for CSS. _Default_: `true`
If you want to disable emmet completely everywhere (not just Svelte), you can also set `"emmet.showExpandedAbbreviation": "never"` in your settings.

##### `svelte.plugin.css.documentColors.enable`

Enable document colors for CSS. _Default_: `true`

##### `svelte.plugin.css.colorPresentations.enable`

Enable color picker for CSS. _Default_: `true`

##### `svelte.plugin.css.documentSymbols.enable`

Enable document symbols for CSS. _Default_: `true`

##### `svelte.plugin.css.selectionRange.enable`

Enable selection range for CSS. _Default_: `true`

##### `svelte.plugin.html.enable`

Enable the HTML plugin. _Default_: `true`

##### `svelte.plugin.html.hover.enable`

Enable hover info for HTML. _Default_: `true`

##### `svelte.plugin.html.completions.enable`

Enable auto completions for HTML. _Default_: `true`

##### `svelte.plugin.html.completions.emmet`

Enable emmet auto completions for HTML. _Default_: `true`
If you want to disable emmet completely everywhere (not just Svelte), you can also set `"emmet.showExpandedAbbreviation": "never"` in your settings.

##### `svelte.plugin.html.tagComplete.enable`

Enable HTML tag auto closing. _Default_: `true`

##### `svelte.plugin.html.documentSymbols.enable`

Enable document symbols for HTML. _Default_: `true`

##### `svelte.plugin.html.renameTags.enable`

Enable rename tags for the opening/closing tag pairs in HTML. _Default_: `true`

##### `svelte.plugin.svelte.enable`

Enable the Svelte plugin. _Default_: `true`

##### `svelte.plugin.svelte.diagnostics.enable`

Enable diagnostic messages for Svelte. _Default_: `true`

##### `svelte.plugin.svelte.compilerWarnings`

Svelte compiler warning codes to ignore or to treat as errors. Example: { 'css-unused-selector': 'ignore', 'unused-export-let': 'error'}

##### `svelte.plugin.svelte.format.enable`

Enable formatting for Svelte (includes css & js) using [prettier-plugin-svelte](https://github.com/sveltejs/prettier-plugin-svelte). _Default_: `true`

You can set some formatting options through this extension. They will be ignored if there's any kind of configuration file, for example a `.prettierrc` file. Read more about Prettier's configuration file [here](https://prettier.io/docs/en/configuration.html).

##### `svelte.plugin.svelte.format.config.svelteSortOrder`

Format: join the keys `options`, `scripts`, `markup`, `styles` with a `-` in the order you want. _Default_: `options-scripts-markup-styles`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `svelte.plugin.svelte.format.config.svelteStrictMode`

More strict HTML syntax. _Default_: `false`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `svelte.plugin.svelte.format.config.svelteAllowShorthand`

Option to enable/disable component attribute shorthand if attribute name and expression are the same. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `svelte.plugin.svelte.format.config.svelteBracketNewLine`

Put the `>` of a multiline element on a new line. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `svelte.plugin.svelte.format.config.svelteIndentScriptAndStyle`

Whether or not to indent code inside `<script>` and `<style>` tags. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `svelte.plugin.svelte.format.config.printWidth`

Maximum line width after which code is tried to be broken up. This is a Prettier core option. If you have the Prettier extension installed, this option is ignored and the corresponding option of that extension is used instead. This option is also ignored if there's any kind of configuration file, for example a `.prettierrc` file. _Default_: `80`

##### `svelte.plugin.svelte.format.config.singleQuote`

Use single quotes instead of double quotes, where possible. This is a Prettier core option. If you have the Prettier extension installed, this option is ignored and the corresponding option of that extension is used instead. This option is also ignored if there's any kind of configuration file, for example a `.prettierrc` file. _Default_: `false`

##### `svelte.plugin.svelte.hover.enable`

Enable hover info for Svelte (for tags like #if/#each). _Default_: `true`

##### `svelte.plugin.svelte.completions.enable`

Enable autocompletion for Svelte (for tags like #if/#each). _Default_: `true`

##### `svelte.plugin.svelte.rename.enable`

Enable rename/move Svelte files functionality. _Default_: `true`

##### `svelte.plugin.svelte.codeActions.enable`

Enable code actions for Svelte. _Default_: `true`

##### `svelte.plugin.svelte.selectionRange.enable`

Enable selection range for Svelte. _Default_: `true`

### Usage with Yarn 2 PnP

1. Run `yarn add -D svelte-language-server` to install svelte-language-server as a dev dependency
2. Run `yarn dlx @yarnpkg/pnpify --sdk vscode` to generate or update the VSCode/Yarn integration SDKs. This also sets the `svelte.language-server.ls-path` setting for the workspace, pointing it to the workspace-installed language server.
3. Restart VSCode.
4. Commit the changes to `.yarn/sdks`
