# V language support for Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version/vlanguage.vscode-vlang.svg)](https://marketplace.visualstudio.com/items?itemName=vlanguage.vscode-vlang)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/vlanguage.vscode-vlang.svg)](https://marketplace.visualstudio.com/items?itemName=vlanguage.vscode-vlang)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vlang/vscode-vlang/CI)
# This extension is a fork from [vscode-vlang](https://github.com/vlang/vscode-vlang) for github1s.

Provides [V language](https://vlang.io) support for Visual Studio Code.

## Table of Contents
- [Preview](#preview)
- [Features](#features)
  - [Code Editing](#code-editing)
  - [Testing](#testing)
  - [Others](#others)

## Features

### Code Editing

- Code Snippets for quick coding.
- Format code on file save as well as format manually (using `v fmt`).
- Linter (Workspace files only).

### Testing

- Run Tests under the cursor, in current file, in current package, in the whole workspace using either commands or codelens.

### Others

- Upload to the V Playground.
- Upload to the DevBits V Playground.

## Usage

You will need to install [Visual Studio Code](https://code.visualstudio.com/) >= `0.26`. In the command palette (Cmd+Shift+P) select Install Extension and choose `V`. You can also install the extension from the [Marketplace](https://marketplace.visualstudio.com/vscode). Open any `.v, .vh, .vsh`  file in VS Code.

_Note_: It is recommended to turn `Auto Save` on in Visual Studio Code (`File -> Auto Save`) when using this extension.

## Commands
- `V: Run current file`
- `V: Build an optimized executable from current file`
- `V: Show help info`
- `V: Show V version`
- `V: Test current file`
- `V: Test current package`
- `V: Upload and share current code to V playground`

You can access all of the above commands from the command palette (Cmd+Shift+P or Ctrl+Shift+P).

## License

[MIT](./LICENSE)
