
<p align="center"><a href="https://jhuix.github.io/markdown-showdown-preview" target="_blank" rel="noopener noreferrer"><img src="https://jhuix.github.io/markdown-showdown-preview/screenshot/vscode-mdsp.png" alt="markdown-showdown-preview"></a></p>

<h1 align="center">MDSP: MarkDown-Showdown-Preview</h1>

A markdown preview vscode extension for showdown.js

## Features

MarkDown-Showdown-Preview(MDSP) is an vscode extension that preview markdown content as HTML and provides you with many useful functionalities such as plantuml, mermaid, LaTeX math and AsciiMath, TOC,export HTML, export PDF etc.

MDSP converte markdown content to html that using the [\@jhuix/showdowns](https://www.npmjs.com/package/@jhuix/showdowns) npm package.

[Showdowns](https://github.com/jhuix/showdowns) is a lib that make markdown to html with some extensions of [showdown.js](https://github.com/showdownjs/showdown). And [showdown.js](https://github.com/showdownjs/showdown) is a Javascript Markdown to HTML converter, based on the original works by John Gruber. Showdown can be used client side (in the browser) or server side (with NodeJs). For more information, refer to the following document:

- [Showdown's Markdown syntax](https://github.com/showdownjs/showdown/wiki/Showdown's-Markdown-syntax)
- [Showdown Options](https://github.com/showdownjs/showdown/wiki/Showdown-options)

## Requirements

For export PDF:

When `markDown-showdown-preview.usePuppeteerCore` setting is true, this extension require puppeteer-core package and google chrome browser or chrome-location package, and `chrome.exe` program path is set to `markdown-showdown-preview.chromePath`. The chrome-location globally installed by npm:

    npm install -g chrome-location

When `markDown-showdown-preview.usePuppeteerCore` setting is false, this extension require puppeteer package. The puppeteer globally installed by npm:

    npm install -g puppeteer


## Install from VS Code (Recommended)

Open vscode editor, then search MarkDown-Showdown-Preview in Extensions, then click Install button.

## Extension Settings

This extension contributes the following settings:

* `markDown-showdown-preview.scrollSync`: true/false Automatic scroll sync.
* `markDown-showdown-preview.usePuppeteerCore`: If set to true, then locally installed puppeteer-core will be required. Otherwise, the puppeteer globally installed by `npm install -g puppeteer` will be required.
* `markdown-showdown-preview.puppeteerWaitForTimeout`: Puppeteer waits for a certain timeout in milliseconds before the document export.
* `markdown-showdown-preview.chromePath`: Chrome executable path, which is used for Puppeteer export. Leaving it empty means the path will be found automatically.

## Keybindings

|Key|	Command|
|---|---|
|ctrl+shift+v or cmd+shift+v	| Open preview |

## Release Notes

### 1.0.0

Support Plantuml.

Support Mermaid.

Support LaTeX math and AsciiMath.

Support TOC and sub-TOC.

Support Text-Align.

## License

[MIT](https://github.com/jhuix/markdown-showdown-preview/blob/master/LICENSE) License

Copyright (c) 2019-present, [Jhuix](mailto:jhuix0117@gmail.com) (Hui Jin)