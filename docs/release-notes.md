# Release Notes

## v1.1.5
1. Update [@jhuix/showdowns](https://github.com/jhuix/showdowns) v0.3.6:

   - Fixed no dynamic loaded katex library, and reducing release file size.

   - Add codeblock field of json in syntax language attribute.

   - Add removeExtension and addExtension functions, delete addExtensions function.

   - Update defaultExtensions of property is object of extensions.

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
