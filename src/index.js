import CodeRendererMain from './vscode/CodeRenderMain';
import GithubFileSystemProvider from './vscode/GithubFileSystemProvider';

window.require = require('vs/loader');
require("vs/workbench/workbench.web.main");

(new CodeRendererMain(new GithubFileSystemProvider())).open();
