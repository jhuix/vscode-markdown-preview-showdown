# Release Notes

## 1.4.8

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.19:

   - Add showdowns-plotly extension.
   - Add showdowns-gnuplot extension.
   - Add cache for plantuml render.
   - Update host attribute type of output script is 'string | HTMLElement'.

2. Support rendering plotly.

3. Support local rendering gnuplot.

## 1.4.7

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.18:

   - Add chapterNumber etc. options of toc.
   - Add showdowns-tex extension.
   - Add showdowns-shiki extension.
   - Add showdowns-mathjax extension.
   - Add local render for kroki and tex extension.
   - Update @viz-js/viz is 3.24.0.
   - Add module attribute of the output script.
   - Optimize toc extension and other codes.

2. Add 'toc.chapterNumber' setting.

3. Add 'code.theme' setting.

4. Support local rendering TEX content.

5. Surpport theme of code block.

6. Surpport defaul engine of inline math is mathjax.

## 1.4.6

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.15:

   - Support kroki api for render diagram.
   - Update regular expression of toc.
   - Fixed css of print.

2. Add 'kroki.website' setting.

3. Add 'Export ➝ WEBP' menu of preview page.

## v1.4.5
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.13:

   - Update css of toc.

2. Preview html with generator's annotation.

## v1.4.4
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.12:

   - Update title of showdows-toc displays the text in the current language.

   - Fixed to fliter duplicate definitions of total toc.

2. Add 'autoToc' setting.

## v1.4.3
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.11:

   - Add vertical divider for vertical total toc.

2. Optimize the loading order of output CSS and scripts.

## v1.4.2
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.6.10:

   - Add css defined extension.

   - Add cssLinks output attribute.

2. Update other dependencies to new version.

3. Modify default font size  of settting is 10px;

4. Use esbuild to build code.

5. Use ESLint to check the code.

## v1.4.1
1. Update @jhuix/showdowns v0.6.7.

## v1.4.0
1. Update @jhuix/showdowns v0.6.6.

## v1.3.10
1. Update @jhuix/showdowns v0.6.4.

2. Support echarts and abcjs plugin.

3. Update name and keywords of package.

## v1.3.8
1. Update @jhuix/showdowns v0.5.7.

## v1.3.7
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.5.6.

2. Modify default values of the 4 math delimiters;

3. Fixed possible invalid custom values of math delimiters.

4. Fixed the bug with fast input failed to render the latest content in markdown files that has multi plantuml.

5. Add output console of 'MDPS Extension' to display output log.

## v1.3.6
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.5.5:

   - Fixed failed to mark CSS link related to render only inline katex math.

   - Add a additional delimiters format of katex options.

2. Adjust the name of all settings;

3. Split katexDelimiters setting into 4 delimiters settings.

4. Fixed failed to render inine katex math when open html in browser or create local html.


## v1.3.4
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.5.3:

   - Optimize showdown and converter objects of markdown parse, add flavor setting features.

   - Add delimiters setting of katex math features.

2. Add delimiters setting of katex math features.

3. Add flavor setting of preview html features.

4. Optimized preview html page.

## v1.3.3
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.5.2:

   - Update asciimath to latex that be based on ASCIIMathTeXImg.js, latest version.

   - Fixed method removeAsyncExtension and removeExtension of showdowns could not remove related extensions.

   - Update mermaid deps new version 8.8.2.

   - Inline LaTex math syntax compatible with [KaTex default delimiters](https://katex.org/docs/autorender.html#api), and inline ascii math syntax is changed to `@@...@@` or `\~...\~`.

   - Support multiple math are separated by an empty line in block math code.

2. Fixed [Issue #3](https://github.com/jhuix/vscode-markdown-preview-showdown/issues/3), [Issue #6](https://github.com/jhuix/vscode-markdown-preview-showdown/issues/6).

3. Enhancement [Issue #2](https://github.com/jhuix/vscode-markdown-preview-showdown/issues/2), [Issue #5](https://github.com/jhuix/vscode-markdown-preview-showdown/issues/5).

4. Optimized rendering of multiple plantuml in the same file.

5. When theme setting of vega or mermaid is changed, it can take effect dynamically.

## v1.3.2
1. Add 'plantumlTheme' configuration.

2. Fixed not include local uml files in plantuml codes.

## v1.3.1
1. Fixed it can not be previewed for multiple plantuml codes in the same file.

## v1.3.0
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.5.0:

   - Add showdown-container extension.
   - Expand the table syntax to implement headerless and colspan or rowspan merge.

2. Update plantuml jar v1.2020.16.

3. Local reference to photos can be working in the preview, use syntax of relative path ('./') or absolute path(file:///):

            [xxx](./a.jpg) or [xxx](file:///c:/a.jpg)

4. Remove features about compress the content with brotli during message transmission, so this reduces the size of the extension pack. 

## v1.2.2
1. Delete condition of files.autoSave to accelerated rendering when upate text of preview page.

2. Remove extension event of onDidSaveTextDocument.

3. Accelerated rendering for plantuml using java single process.

## v1.2.1
1. Add custom font size setting of preview page, default "14" px.

2. Fixed not auto found setup path of chrome in windows platform.

## v1.2.0
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.4.0:

   - Add render diagram mode is asynchronous using promise-resolve, but exclude showdown-sequence.

2. When rendering a diagram (exclude js-sequence diagram), the page diagram does not flicker.

3. Add render mode setting of plantuml diagram, can choose from 'local' or 'remote'.

4. Add remote render website setting of plantuml diagram.

## v1.1.8

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.8:

   - Update check css types extension.

2. Continue to fixed the preview scrolls to top when editing markdown file.

## v1.1.7

1. Fixed bug that can not be previewed for the first time in v1.1.6.

## v1.1.6

1. Fixed the preview scrolls to top when switch to active between markdown and non markdown file.

2. Fixed sometimes the preview scrolls to top when editing markdown file.

3. Update logo png.

## v1.1.5

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.6:

   - Fixed no dynamic loaded katex library, and reducing release file size.

   - Add codeblock field of json in syntax language attribute.

   - Add removeExtension and addExtension functions, delete addExtensions function.

   - Update defaultExtensions of property is object of extensions.

2. Update short key of preview is 'ctrl+shift+v ctrl+shift+v'.

## v1.1.4

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.3:

   - Support align field of more diagrams that vaule is selected empty("left") or "center" or "right" in code language attribute.

   - Support render svg format for vega and vega-lite diagrams.

2. Update new logo image of extension.

3. Fixed sync sroll between markdown content and preview html page.

4. Fixed the problem that can not display diagrams of vega when export to html or pdf or png or jpg.

## v1.1.3

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.2:

   - Support [Vega and Vega-Lite](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#vega-and-vega-lite)

2. Add `mermaidTheme` settings, range of values: ['default', 'forest', 'dark', 'neutral'], default `default` string.

3. Add `vegaTheme` settings, range of values: ['excel', 'ggplot2', 'quartz', 'vox', 'dark'], default `vox` string.

4. Support international localization of resources, currently support English(en) and Chinese(zh-cn).

## v1.1.2

1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.1
2. Change extension name to markdown-preview-showdown (MDPS).

## v1.1.0

1.  Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) version >= 0.3.0, Support more diagrams extensions:
  
    - Support [LaTeX math and AsciiMath](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#latex-math-and-asciimath)

    - Support [Mermaid](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#mermaid)

    - Support [Plantuml](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#plantuml)

    - Support [Flowchart](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#flowchart)

    - Support [Network Sequence](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#network-sequence)

    - Support [Graphviz's dot](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#graphviz-s-dot)

    - Support [Railroad diagrams](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#railroad-diagrams)

    - Support [WaveDrom](https://github.com/jhuix/showdowns/blob/master/docs/showdowns-features.md#wavedrom)

2.  Can export html page to PNG and JPG images.
3.  Add `maxContenSize` settings, default `32768(32K)` Bytes.

## v1.0.1

Fix repository url in package.json.

## v1.0.0

Support Plantuml.

Support Mermaid.

Support LaTeX math and AsciiMath.

Support TOC and sub-TOC.

Support Text-Align.
