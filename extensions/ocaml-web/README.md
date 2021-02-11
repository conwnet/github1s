# VSCode OCaml Platform

[![Main workflow](https://img.shields.io/github/workflow/status/ocamllabs/vscode-ocaml-platform/Main%20workflow?branch=master)](https://github.com/ocamllabs/vscode-ocaml-platform/actions?query=workflow%3A%22Main+workflow%22+branch%3Amaster)

# This extension is a fork from [vscode-ocaml-platform](https://github.com/ocamllabs/vscode-ocaml-platform) for github1s.

Visual Studio Code extension for OCaml and relevant tools.

_Please report any bugs you encounter._

## Quick start

1. Install this extension from
   [the VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=ocamllabs.ocaml-platform)
   (or by entering `ext install ocamllabs.ocaml-platform` at the command palette
   <kbd>Ctrl</kbd>+<kbd>P</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on
   MacOS)
2. Open a OCaml/ReasonML project (`File > Add Folder to Workspace...`)
3. Install [OCaml-LSP](https://github.com/ocaml/ocaml-lsp) with
   [opam](https://github.com/ocaml/opam) or [esy](https://github.com/esy/esy).
   E.g. `opam install ocaml-lsp-server`

### Windows

Install [OCaml for Windows](https://fdopen.github.io/opam-repository-mingw/) and
make sure the `ocaml-env` program is accessible on the PATH (`ocaml-env` is in
the `usr/local/bin` folder relative to the installation directory).

### ReScript / BuckleScript

The new ReScript syntax (`res` and `resi` files) is not supported, you should
use [rescript-vscode](https://github.com/rescript-lang/rescript-vscode) instead.

ReasonML, as an alternative syntax for OCaml, is supported out-of-the-box, as
long as `reason` is installed in your environment.

If you're looking for a way to use OCaml or ReasonML syntax in a ReScript
project, you'll need to install `ocaml-lsp` in your environment. We recommend
using Esy for this:

1. Install esy

```bash
npm install esy --global
```

2. Add `esy.json` to the project root with following content:

```json
{
  "dependencies": {
    "@opam/ocaml-lsp-server": "*",
    "@opam/ocamlfind-secondary": "*",
    "@opam/reason": "*",
    "ocaml": "4.6.x"
  }
}
```

3. Install and build packages

```bash
esy
```

## Features

- Syntax highlighting
  - ATD
  - Cram tests
  - Dune
  - Menhir
  - Merlin
  - META
  - OASIS
  - OCaml
  - OCamlbuild
  - OCamlFormat
  - OCamllex
  - opam
  - ReasonML
  - Eliom
- Indentation rules
- Snippets
  - Dune
  - OCaml
  - OCamllex
- Task Provider
  - Dune

## Configuration

This extension provides options in VSCode's configuration settings. You can find
the settings under `File > Preferences > Settings`.

| Name                               | Description                                                                                             | Default |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `ocaml.sandbox`                    | Determines where to find the sandbox for a given project                                                | `null`  |
| `ocaml.dune.autoDetect`            | Controls whether dune tasks should be automatically detected.                                           | `true`  |
| `ocaml.trace.server`               | Controls the logging output of the language server. Valid settings are `off`, `messages`, or `verbose`. | `off`   |
| `ocaml.useOcamlEnv`                | Controls whether to use ocaml-env for opam commands from OCaml for Windows.                             | `true`  |
| `ocaml.terminal.shell.linux`       | The path of the shell that the sandbox terminal uses on Linux                                           | `null`  |
| `ocaml.terminal.shell.osx`         | The path of the shell that the sandbox terminal uses on macOS                                           | `null`  |
| `ocaml.terminal.shell.windows`     | The path of the shell that the sandbox terminal uses on Windows                                         | `null`  |
| `ocaml.terminal.shellArgs.linux`   | The command line arguments that the sandbox terminal uses on Linux                                      | `null`  |
| `ocaml.terminal.shellArgs.osx`     | The command line arguments that the sandbox terminal uses on macOS                                      | `null`  |
| `ocaml.terminal.shellArgs.windows` | The command line arguments that the sandbox terminal uses on Window                                     | `null`  |

If `ocaml.terminal.shell.*` or `ocaml.terminal.shellArgs.*` is `null`, the
configured VSCode shell and shell arguments will be used instead.

## Commands

You can execute it by entering the following command at the command palette
<kbd>Ctrl</kbd>+<kbd>P</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on
MacOS).

| Name                         | Description                                 | Keyboard Shortcuts | Menu Contents |
| ---------------------------- | ------------------------------------------- | ------------------ | ------------- |
| `ocaml.select-sandbox`       | Select sandbox for this workspace           |                    |               |
| `ocaml.server.restart`       | Restart language server                     |                    |               |
| `ocaml.open-terminal`        | Open a terminal (current sandbox)           |                    |               |
| `ocaml.open-terminal-select` | Open a terminal (select a sandbox)          |                    |               |
| `ocaml.current-dune-file`    | Open Dune File (located in the same folder) |                    |               |

## Requirements

- [ocaml/ocaml-lsp](https://github.com/ocaml/ocaml-lsp)
