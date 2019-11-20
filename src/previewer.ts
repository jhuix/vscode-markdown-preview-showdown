"use strict";

import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { PreviewConfig } from "./config";

const utils = require("./utils");
const { debounce } = require("throttle-debounce");
const zlibcodec = require("./zlib-codec.js");

// Class Showdown MarkDown Previewer
export class ShowdownPreviewer {
  public static getPackageName() {
    return PreviewConfig.packageName;
  }
  public static isMarkdownFile(document: vscode.TextDocument) {
    // prevent processing of own documents
    return document && document.languageId === "markdown";
  }
  /**
   * Get the top-most visible range of `editor`.
   *
   * Returns a fractional line number based the visible character within the line.
   * Floor to get real line number
   */
  private static getTopVisibleLine(editor: vscode.TextEditor) {
    if (!editor.visibleRanges.length) {
      return 0;
    }
    return editor.visibleRanges[0].start.line;
  }

  /**
   * Get the bottom-most visible range of `editor`.
   *
   * Returns a fractional line number based the visible character within the line.
   * Floor to get real line number
   */
  private static getBottomVisibleLine(editor: vscode.TextEditor) {
    if (!editor.visibleRanges.length) {
      return 0;
    }
    return editor.visibleRanges[0].end.line;
  }

  private firstPreview: boolean;
  private config: PreviewConfig;
  private context: vscode.ExtensionContext;
  private editorScrollDelay: number;
  private editor: vscode.TextEditor | undefined = undefined;
  private webpanel: vscode.WebviewPanel | undefined = undefined;
  private uri: vscode.Uri | undefined = undefined;
  private debounceUpdatePreview = debounce(100 * 3, (that: ShowdownPreviewer, uri: vscode.Uri) => {
    that.updatePreview(uri);
  });
  private debouncePostMessage = debounce(100 * 3, (webView: vscode.Webview, message: any) => {
    webView.postMessage(message);
  });

  public constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.firstPreview = false;
    this.editorScrollDelay = Date.now();
    this.config = PreviewConfig.getCurrentConfig(context);
  }

  public async openPreview(
    uri: vscode.Uri,
    editor: vscode.TextEditor,
    viewOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean }
  ) {
    if (this.webpanel) {
      const targetUri = this.uri;
      const oldResourceRoot = !targetUri
        ? ""
        : this.getProjectDirectoryPath(targetUri, vscode.workspace.workspaceFolders) || path.dirname(targetUri.fsPath);
      const newResourceRoot =
        this.getProjectDirectoryPath(uri, vscode.workspace.workspaceFolders) || path.dirname(uri.fsPath);
      if (oldResourceRoot !== newResourceRoot) {
        this.webpanel.dispose();
        this.webpanel = undefined;
        this.openPreview(uri, editor, viewOptions);
        return;
      }
      this.uri = uri;
      this.editor = editor;
    } else {
      const localResourceRoots = [
        vscode.Uri.file(path.join(this.context.extensionPath, "media")),
        vscode.Uri.file(path.join(this.context.extensionPath, "node_modules/@jhuix/showdowns/dist")),
        vscode.Uri.file(path.join(this.context.extensionPath, "node_modules/@jhuix/showdowns/dist/fonts")),
        vscode.Uri.file(os.tmpdir()),
        vscode.Uri.file(
          this.getProjectDirectoryPath(uri, vscode.workspace.workspaceFolders) || path.dirname(uri.fsPath)
        )
      ];
      const previewPanel = vscode.window.createWebviewPanel(
        ShowdownPreviewer.getPackageName(),
        `Preview ${path.basename(uri.fsPath)}`,
        viewOptions,
        {
          localResourceRoots,
          enableScripts: true
        }
      );
      this.webpanel = previewPanel;
      this.uri = uri;
      this.editor = editor;

      // register previewPanel message events
      previewPanel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case "openInBrowser":
              this.openInBrowser(message.args[0], message.args[1], message.args[2], message.args[3]);
              break;
            case "exportHTML":
              this.exportHTML(message.args[0], message.args[1], message.args[2], message.args[3]);
              break;
            case "exportPDF":
              this.exportPDF(message.args[0], message.args[1], message.args[2], message.args[3]);
              break;
            case "webviewLoaded":
              this.updateCurrentView();
              break;
            case "revealLine":
              this.revealLine(message.args[0], message.args[1]);
              break;
          }
        },
        null,
        this.context.subscriptions
      );

      // unregister previewPanel
      previewPanel.onDidDispose(
        () => {
          this.dispose();
        },
        null,
        this.context.subscriptions
      );

      // Update the content based on view changes
      previewPanel.onDidChangeViewState(
        e => {
          if (previewPanel.visible) {
            this.generateHTML();
          }
        },
        null,
        this.context.subscriptions
      );
    }

    this.generateHTML();
    if (!this.firstPreview) {
      this.firstPreview = true;
    }
  }

  public async saveLocalHtml(
    htmlPath: string,
    doc: { type: string; content: string } | string,
    title: string,
    types: { hasKatex: boolean }
  ) {
    if (!title) {
      title = "预览MARKDOWN文件";
    }
    if (typeof doc === "object") {
      if (typeof doc.content === "string") {
        if (typeof doc.type === "string") {
          switch (doc.type) {
            case "zip":
              doc = zlibcodec.decode(doc.content);
              break;
            case "br":
              doc = zlibcodec.brDecode(doc.content);
              break;
            default:
              doc = doc.content;
              break;
          }
        } else {
          doc = doc.content;
        }
      }
    }
    const showdowncss = await utils.readFile(
      path.join(this.context.extensionPath, "node_modules/@jhuix/showdowns/dist/showdowns.min.css"),
      {
        encoding: "utf-8"
      }
    );

    let katexstyle = "";
    if (typeof types === "object" && types.hasKatex) {
      const katexcss = await utils.readFile(
        path.join(this.context.extensionPath, "node_modules/@jhuix/showdowns/dist/katex.min.css"),
        {
          encoding: "utf-8"
        }
      );

      katexstyle = `<style type="text/css">${katexcss.replace(
        /url\(fonts/gi,
        "url(https://jhuix.github.io/showdowns/dist/fonts"
      )}</style>`;
    }

    const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style type="text/css">
    * {
      margin: 0;
      padding: 0;
      border: none;
    }
    html {
      font-size: 16px;
      line-height: 1.6;
      overflow: initial;
      box-sizing: border-box;
      word-wrap: break-word;
    }
    *,
    :after,
    :before {
      box-sizing: inherit;
    }
    body {
      color: #333;
      background: #f9f9f9;
      font-size: 16px;
      min-height: 100%;
      position: relative;
      font-family: Helvetica Neue, NotoSansHans-Regular, AvenirNext-Regular, arial, Hiragino Sans GB, Microsoft Yahei, WenQuanYi Micro Hei, Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      height: 100%;
    }
    a {
      color: rgb(0, 122, 204);
    }
    a:hover,
    a:focus {
      color: rgb(0, 137, 255);
    }
    code {
      background-color: #f8f8f8;
      border-color: #dfdfdf;
      color: #333;
    }
    .workspace-container {
      overflow: hidden;
      margin: 8px 15px 8px 15px;
    }
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
    }
    ::-webkit-scrollbar-track {
      background: rgb(241, 241, 241);
      border-radius: 0;
    }
    ::-webkit-scrollbar-thumb {
      cursor: pointer;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.25);
      transition: color 0.2s ease;
    }
    ::-webkit-scrollbar-thumb:window-inactive {
      background: rgba(0, 0, 0, 0.15);
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 135, 139, 0.8);
    }
    </style>
    <style type="text/css">${showdowncss}</style>
    ${katexstyle}
    </head>
    <body>
    <div class="workspace-container">${doc}</div>
    </body>
    </html>`;

    await utils.writeFile(htmlPath, html, {
      encoding: "utf-8"
    });
  }

  public async openInBrowser(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    types: { hasKatex: boolean }
  ) {
    if (uri) {
      const srcUri = vscode.Uri.parse(uri);
      uri = srcUri.fsPath;
      const fsHash = crypto.createHash("md5");
      fsHash.update(uri);
      uri = path.join(path.resolve(os.tmpdir()), `mdsp-${fsHash.digest("hex")}.html`);
    } else {
      uri = path.join(path.resolve(os.tmpdir()), `mdsp-temp.html`);
    }
    await this.saveLocalHtml(uri, doc, title, types);
    utils.openFile(uri);
    vscode.window.showInformationMessage(`Browser HTML from: ${uri}`);
  }

  public async exportHTML(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    types: { hasKatex: boolean }
  ) {
    if (uri) {
      const srcUri = vscode.Uri.parse(uri);
      uri = srcUri.fsPath;
      const extname = path.extname(uri);
      uri = uri.replace(new RegExp(extname + "$"), ".html");
      await this.saveLocalHtml(uri, doc, title, types);
      utils.openFile(uri);
      vscode.window.showInformationMessage(`Stored HTML To: ${uri}`);
    }
  }

  public async exportPDF(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    types: { hasKatex: boolean },
    fileType = "pdf"
  ) {
    if (!uri) return;

    const srcUri = vscode.Uri.parse(uri);
    uri = srcUri.fsPath;
    const fsHash = crypto.createHash("md5");
    fsHash.update(uri);
    const htmlPath = path.join(path.resolve(os.tmpdir()), `mdsp-${fsHash.digest("hex")}.html`);
    await this.saveLocalHtml(htmlPath, doc, title, types);

    const extname = path.extname(uri);
    uri = uri.replace(new RegExp(extname + "$"), `.${fileType}`);

    let browser = null;
    let puppeteer = null;
    if (this.config.usePuppeteerCore) {
      puppeteer = require("puppeteer-core");
      browser = await puppeteer.launch({
        executablePath: this.config.chromePath || require("chrome-location"),
        headless: true
      });
    } else {
      const globalNodeModulesPath = (
        await utils.execFile(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"])
      )
        .trim()
        .split("\n")[0]
        .trim();
      puppeteer = require(path.resolve(globalNodeModulesPath, "./puppeteer")); // trim() function here is very necessary.
      browser = await puppeteer.launch({
        headless: true
      });
    }
    if (!browser) return;

    const page = await browser.newPage();
    const loadPath = "file:///" + htmlPath;
    await page.goto(loadPath);
    let puppeteerConfig = {
      path: uri,
      margin: {
        top: "1cm",
        bottom: "1cm",
        left: "1cm",
        right: "1cm"
      },
      printBackground: this.config.printBackground
    };
    // wait for timeout
    if (this.config.puppeteerWaitForTimeout && this.config.puppeteerWaitForTimeout > 0) {
      await page.waitFor(this.config.puppeteerWaitForTimeout);
    }
    if (fileType === "pdf") {
      await page.pdf(puppeteerConfig);
    } else {
      await page.screenshot({ fullPage: true, ...puppeteerConfig });
    } // <= set to fullPage by default
    browser.close();
    utils.openFile(uri);
    vscode.window.showInformationMessage(`Stored PDF To: ${uri}`);
  }
  /**
   * Close all previews
   */
  public dispose() {
    if (this.webpanel) {
      this.webpanel.dispose();
    }
    this.webpanel = undefined;
    this.uri = undefined;
    this.editor = undefined;
    this.firstPreview = false;
  }
  public previewPostMessage(message: any) {
    const preview = this.getPreview();
    if (preview) {
      this.debouncePostMessage(preview.webview, message);
    }
  }
  public isSameUri(uri: vscode.Uri) {
    if (!this.uri) {
      return false;
    }
    return this.uri.fsPath === uri.fsPath;
  }
  public updatePreview(uri: vscode.Uri) {
    const previewPanel = this.getPreview();
    if (previewPanel) {
      this.refreshPreview(previewPanel, uri);
    }
  }
  public update(uri: vscode.Uri) {
    this.debounceUpdatePreview(this, uri);
  }
  public updateCurrentView() {
    if (this.uri) this.updatePreview(this.uri);
  }
  public updateConfiguration() {
    const newConfig = PreviewConfig.getCurrentConfig(this.context);
    if (!this.config.isEqualTo(newConfig)) {
      this.config = newConfig;
    }
  }
  public isFirstPreview() {
    return this.firstPreview;
  }
  public getPreview() {
    return this.webpanel;
  }
  public getEditor() {
    return this.editor;
  }
  public isPreviewOn() {
    return !!this.getPreview();
  }
  public isAutoPreview() {
    return this.config.autoPreview;
  }

  public changeActiveTextEditor(editor: vscode.TextEditor) {
    if (editor && editor.document && editor.document.uri) {
      if (ShowdownPreviewer.isMarkdownFile(editor.document)) {
        const sourceUri = editor.document.uri;
        /**
         * If the preview is on,
         * when we switched text ed()tor,
         * update preview to that text editor.
         */
        if (!this.isPreviewOn()) return false;

        if (!this.isSameUri(sourceUri)) {
          const previewPanel = this.getPreview();
          const viewColumn = previewPanel && previewPanel.viewColumn ? previewPanel.viewColumn : vscode.ViewColumn.Two;
          this.openPreview(sourceUri, editor, {
            preserveFocus: true,
            viewColumn
          });
        } else {
          const previewPanel = this.getPreview();
          if (previewPanel) {
            previewPanel.reveal(vscode.ViewColumn.Two, true);
          }
        }
      }
    }
    return true;
  }

  public changeTextEditorSelection(editor: vscode.TextEditor) {
    if (!this.config.scrollSync || Date.now() < this.editorScrollDelay || !editor.visibleRanges.length) {
      return;
    }

    const topLine = ShowdownPreviewer.getTopVisibleLine(editor);
    const bottomLine = ShowdownPreviewer.getBottomVisibleLine(editor);
    let midLine;
    if (topLine === 0) {
      midLine = 0;
    } else if (Math.floor(bottomLine) === editor.document.lineCount - 1) {
      midLine = bottomLine;
    } else {
      midLine = Math.floor((topLine + bottomLine) / 2);
    }
    this.previewPostMessage({
      command: "changeTextEditorSelection",
      line: midLine
    });
  }

  private async generateHTML() {
    if (this.webpanel && this.uri && this.editor) {
      const editor = this.editor;
      this.webpanel.title = `Preview ${path.basename(this.uri.fsPath)}`;
      this.generateHTMLTemplate(this.uri, this.webpanel.webview);
    }
  }
  /**
   * Add file:/// to file path
   * If it's for VSCode preview, add vscode-resource:/// to file path
   */
  private changeFileProtocol(webview: vscode.Webview | null, relativePath: string, isForVSCodePreview: boolean) {
    const diskPath = vscode.Uri.file(path.join(this.context.extensionPath, relativePath));

    if (isForVSCodePreview && webview) {
      return webview.asWebviewUri(diskPath).toString();
    }

    return diskPath.toString();
  }

  private generateHTMLTemplate(uri: vscode.Uri, webview: vscode.Webview) {
    const title = path.basename(uri.fsPath, path.extname(uri.fsPath));
    // const zcontent = zlibcodec.brEncode(text);
    // <meta id="md-data" data-uri="${uri.toString()}" data-type="br" data="${zcontent}" data-lines="${totalLines}" data-currline="${initialLine}">
    webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style type="text/css">
  body {
    font-size: 16px;
    line-height: 1.6;
  }
  a {
    color: #569cd6;
  }
  a:hover {
    color: #00a3f5;
  }
</style>
<link rel="stylesheet" href="${this.changeFileProtocol(
      webview,
      `node_modules/@jhuix/showdowns/dist/showdowns.br.min.css`,
      true
    )}">
<link rel="stylesheet" href="${this.changeFileProtocol(
      webview,
      `node_modules/@jhuix/showdowns/dist/katex.min.css`,
      true
    )}">
<link rel="stylesheet" href="${this.changeFileProtocol(webview, `media/contextmenu.css`, true)}">
</head>
<body>
<script src="${this.changeFileProtocol(
      webview,
      `node_modules/@jhuix/showdowns/dist/showdowns.br.min.js`,
      true
    )}"></script>
<script src="${this.changeFileProtocol(webview, `media/webview.js`, true)}"></script>
</body>
</html>`;
  }

  private async refreshPreview(previewPanel: vscode.WebviewPanel, uri: vscode.Uri) {
    const editor = this.getEditor();
    if (previewPanel && editor && editor.document && ShowdownPreviewer.isMarkdownFile(editor.document)) {
      let initialLine = 0;
      initialLine = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!editor.visibleRanges.length) {
            return resolve(editor.selections[0].active.line || 0);
          }

          const topLine = editor.visibleRanges[0].start.line;
          const bottomLine = editor.visibleRanges[0].end.line;
          let midLine;
          if (topLine === 0) {
            midLine = 0;
          } else if (Math.floor(bottomLine) === editor.document.lineCount - 1) {
            midLine = bottomLine;
          } else {
            midLine = Math.floor((topLine + bottomLine) / 2);
          }
          return resolve(midLine);
        }, 100);
      });
      const lines = editor.document.lineCount;
      const caption = path.basename(uri.fsPath, path.extname(uri.fsPath));
      const text = editor.document.getText();
      const zcontent = zlibcodec.brEncode(text);
      this.previewPostMessage({
        command: "updateMarkdown",
        uri: uri.toString(),
        title: caption,
        totalLines: lines,
        currentLine: initialLine,
        markdown: { type: "br", content: zcontent }
      });
    }
  }
  private revealLine(uri: string, line: number) {
    if (!this.config.scrollSync) return;

    const sourceUri = vscode.Uri.parse(uri);
    vscode.window.visibleTextEditors
      .filter(
        editor => ShowdownPreviewer.isMarkdownFile(editor.document) && editor.document.uri.fsPath === sourceUri.fsPath
      )
      .forEach(editor => {
        const sourceLine = Math.min(Math.floor(line), editor.document.lineCount - 1);
        const fraction = line - sourceLine;
        const text = editor.document.lineAt(sourceLine).text;
        const start = Math.floor(fraction * text.length);
        this.editorScrollDelay = Date.now() + 100 * 5;
        editor.revealRange(new vscode.Range(sourceLine, 0, sourceLine + 1, 0), vscode.TextEditorRevealType.InCenter);
        this.editorScrollDelay = Date.now() + 100 * 5;
      });
  }
  /**
   * Format pathString if it is on Windows. Convert `c:\` like string to `C:\`
   * @param pathString string
   */
  private formatPathIfNecessary(pathString: string) {
    if (process.platform === "win32") {
      pathString = pathString.replace(/^([a-zA-Z])\:\\/, (_, $1) => `${$1.toUpperCase()}:\\`);
    }
    return pathString;
  }
  private getProjectDirectoryPath(uri: vscode.Uri, workspaceFolders: vscode.WorkspaceFolder[] = []) {
    const possibleWorkspaceFolders = workspaceFolders.filter(workspaceFolder => {
      return path.dirname(uri.path.toUpperCase()).indexOf(workspaceFolder.uri.path.toUpperCase()) >= 0;
    });
    let projectDirectoryPath;
    if (possibleWorkspaceFolders.length) {
      // We pick the workspaceUri that has the longest path
      const workspaceFolder = possibleWorkspaceFolders.sort((x, y) => y.uri.fsPath.length - x.uri.fsPath.length)[0];
      projectDirectoryPath = workspaceFolder.uri.fsPath;
    } else {
      projectDirectoryPath = "";
    }
    return this.formatPathIfNecessary(projectDirectoryPath);
  }
  private getFilePath(uri: vscode.Uri) {
    return this.formatPathIfNecessary(uri.fsPath);
  }
  private getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const textLen = 32;
    for (let i = 0; i < textLen; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
