
<h1 align="center">MDPS: MarkDown-Preview-Showdown</h1>

<p align="center"><a href="https://jhuix.github.io/vscode-markdown-preview-showdown" target="_blank" rel="noopener noreferrer"><img src="https://jhuix.github.io/vscode-markdown-preview-showdown/screenshot/vscode-mdps.png" alt="markdown-preview-showdown"></a></p>

A excellent markdown preview vscode extension with [showdowns](https://github.com/jhuix/showdowns) that converte markdown content to preview html.

## Features

[MarkDown-Preview-Showdown(MDPS)](https://marketplace.visualstudio.com/items?itemName=jhuix.markdown-preview-showdown) is an vscode extension that preview markdown content as HTML and provides you with many useful functionalities such as plantuml, mermaid, LaTeX math and AsciiMath, TOC, export HTML, export PDF etc.

MDPS converte markdown content to html that using the [\@jhuix/showdowns](https://www.npmjs.com/package/@jhuix/showdowns) npm package. See to [Demo Features](https://jhuix.github.io/vscode-markdown-preview-showdown).

![features-gif](https://jhuix.github.io/vscode-markdown-preview-showdown/screenshot/mdps.gif)

[Showdowns](https://github.com/jhuix/showdowns) is a lib that make markdown to html with some extensions of [showdown.js](https://github.com/showdownjs/showdown). And [showdown.js](https://github.com/showdownjs/showdown) is a Javascript Markdown to HTML converter, based on the original works by John Gruber. Showdown can be used client side (in the browser) or server side (with NodeJs). For more information, refer to the following document:

- [Showdown's Markdown syntax](https://github.com/showdownjs/showdown/wiki/Showdown's-Markdown-syntax)
- [Showdown Options](https://github.com/showdownjs/showdown/wiki/Showdown-options)
- [Showdowns readme](https://github.com/jhuix/showdowns/blob/master/README.md)
- [Showdowns Features](https://github.com/jhuix/showdowns/blob/master/public/showdowns-features.md)

## Requirements

For export PDF or PNG or JPEG:

When `markdown-preview-showdown.usePuppeteerCore` setting is true, this extension require puppeteer-core package and google chrome browser or chrome-location package, and `chrome.exe` program path is set to `markdown-preview-showdown.chromePath`. The chrome-location globally installed by npm:

    npm install -g chrome-location

When `markdown-preview-showdown.usePuppeteerCore` setting is false, this extension require puppeteer package. The puppeteer globally installed by npm:

    npm install -g puppeteer


## Install from VS Code (Recommended)

Open vscode editor, then search markdown-preview-showdown in Extensions, then click Install button.

## Extension Settings

This extension contributes the following settings:

* `markdown-preview-showdown.autoPreview`: Automatic preview markdown file, default false.
* `markdown-preview-showdown.flavor`: Flavor of preview html page, you can choose one from ["github", "ghost", "vanilla"], default is "github" flavor.
* `markdown-preview-showdown.scrollSync`: Automatic scroll sync, default true.
* `markdown-preview-showdown.maxContentSize`: When markdown content size exceeds 'maxContentSize' value, compress the content with brotli during message transmission, default 32768(32K) Bytes.
* `markdown-preview-showdown.mermaidTheme`: Mermaid theme, you can choose one from ["default", "dark", "forest", "neutral"], default is "default" theme.
* `markdown-preview-showdown.vegaTheme`: Vega theme, you can choose one from ["excel", "ggplot2", "quartz", "vox", "dark"], default is "vox"  theme.
* `markdown-preview-showdown.usePuppeteerCore`: If set to true, then locally installed puppeteer-core will be required. Otherwise, the puppeteer globally installed by `npm install -g puppeteer` will be required, defualt true.
* `markdown-preview-showdown.puppeteerWaitForTimeout`: Puppeteer waits for a certain timeout in milliseconds before the document export, default false.
* `markdown-preview-showdown.chromePath`: Chrome executable path, which is used for Puppeteer export. Leaving it empty means the path will be found automatically.

## Keybindings

|OS|Key|Command|
|----|-----|----|
|WINDOWS|ctrl+shift+v ctrl+shift+v| openPreview |
|MAC|cmd+shift+v cmd+shift+v| openPreview |

## Release Notes

Please see the [release-notes](https://github.com/jhuix/vscode-markdown-preview-showdown/blob/master/docs/release-notes.md) page.

## License

[MIT](https://github.com/jhuix/markdown-preview-showdown/blob/master/LICENSE) License

Copyright (c) 2019-present, [Jhuix](mailto:jhuix0117@gmail.com) (Hui Jin)