# Release Notes

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
