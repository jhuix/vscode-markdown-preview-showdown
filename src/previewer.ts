/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { PreviewConfig } from './config';

const utils = require('./utils');
const output = require('./output');
const { debounce } = require('throttle-debounce');
const zlibcodec = require('./zlib-codec.js');
const plantumlAPI = require('./plantuml');


// tslint:disable-next-line: class-name
interface outerScript {
  name: string|undefined|null;
  src:  string|undefined|null;
}

// tslint:disable-next-line: class-name
interface innerScript {
  id: string|undefined|null;
  code: string|undefined|null;
}

// tslint:disable-next-line: class-name
interface localizedInfo {
  [key: string]: string;
}

const localizedMessage: {
  [key: string]: localizedInfo;
} = {
  en: {
    'msg.exploredir': 'Explore Directory',
    'msg.browsehtml': 'Browse local HTML page:\r\n {0}',
    'msg.createdfile': 'File {0} was created at path:\r\n {1}',
    'msg.previewfile': 'Preview {0}'
  },
  'zh-cn': {
    'msg.exploredir': '浏览目录',
    'msg.browsehtml': '浏览本地HTML页面:\r\n {0}',
    'msg.createdfile': '文件 {0} 已被创建在文件路径下:\r\n {1}',
    'msg.previewfile': '预览 {0}'
  }
};

function format(message: string, args: any[]): string {
  let result: string;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      let index = rest[0];
      let arg = args[index];
      let replacement = match;
      if (typeof arg === 'string') {
        replacement = arg;
      } else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
        replacement = String(arg);
      }
      return replacement;
    });
  }
  return result;
}

function localize(locale: string, key: string, ...args: any[]): string {
  let message: string;
  let localizer: localizedInfo;
  if (!locale || !localizedMessage.hasOwnProperty(locale) || !localizedMessage[locale]) {
    locale = 'en';
  }
  localizer = localizedMessage[locale];
  message = localizer[key];
  if (!message) {
    return message;
  }

  return format(message, args);
}

// Class Showdown MarkDown Previewer
export class ShowdownPreviewer {
  public static getPackageName() {
    return PreviewConfig.packageName;
  }
  public static isMarkdownFile(document: vscode.TextDocument) {
    // prevent processing of own documents
    return document && document.languageId === 'markdown';
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
  private options: {
    flavor: string | undefined,
    plantuml: Object | undefined | null,
    markdown: Object | undefined | null,
    mermaid: Object | undefined | null,
    katex: Object | undefined | null,
    vega: Object | undefined | null
  };
  private currentLine: number;
  private context: vscode.ExtensionContext;
  private editorScrollDelay: number;
  private editor: vscode.TextEditor | undefined = undefined;
  private webpanel: vscode.WebviewPanel | undefined = undefined;
  private uri: vscode.Uri | undefined = undefined;
  private debounceUpdatePreview = debounce(5 * 5 * 10, (that: ShowdownPreviewer, uri: vscode.Uri) => {
    that.updatePreview(uri);
  });
  private debouncePostMessage = debounce(3 * 5 * 10, (webView: vscode.Webview, message: any) => {
    if (message.command !== 'breakMessage') {
      webView.postMessage(message);
    }
  });

  public constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.firstPreview = false;
    this.currentLine = 0;
    this.editorScrollDelay = Date.now();
    this.options = {
      flavor: '',
      plantuml: {},
      markdown: {},
      mermaid: {},
      katex: {},
      vega: {}
    };
    this.config = PreviewConfig.getCurrentConfig(context);
    this._getChangedOptions(false);
    output.log('Showdown Previewer is created.');
  }

  public async openPreview(
    uri: vscode.Uri,
    editor: vscode.TextEditor,
    viewOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean }
  ) {
    if (this.webpanel) {
      const targetUri = this.uri;
      const oldResourceRoot = !targetUri
        ? ''
        : this.getProjectDirectoryPath(targetUri) || path.dirname(targetUri.fsPath);
      const newResourceRoot = this.getProjectDirectoryPath(uri) || path.dirname(uri.fsPath);
      if (oldResourceRoot !== newResourceRoot) {
        const webpanel = this.webpanel;
        this.webpanel = undefined;
        webpanel.dispose();
        this.openPreview(uri, editor, viewOptions);
        return;
      }
      this.uri = uri;
      this.editor = editor;
    } else {
      const localResourceRoots = [
        vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
        vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules')),
        vscode.Uri.file(os.tmpdir()),
        vscode.Uri.file(this.getProjectDirectoryPath(uri) || path.dirname(uri.fsPath))
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
        (message) => {
          switch (message.command) {
            case 'openInBrowser':
              this.openInBrowser(message.args[0], message.args[1], message.args[2], message.args[3], message.args[4], message.args[5]);
              break;
            case 'exportHTML':
              this.exportHTML(message.args[0], message.args[1], message.args[2], message.args[3], message.args[4], message.args[5]);
              break;
            case 'exportPDF':
              this.exportChrome(message.args[0], message.args[1], message.args[2], message.args[3], message.args[4], message.args[5]);
              break;
            case 'exportPNG':
              this.exportChrome(
                message.args[0],
                message.args[1],
                message.args[2],
                message.args[3],
                message.args[4],
                message.args[5],
                'png'
              );
              break;
            case 'exportJPEG':
              this.exportChrome(
                message.args[0],
                message.args[1],
                message.args[2],
                message.args[3],
                message.args[4],
                message.args[5],
                'jpg'
              );
              break;
            case 'webviewLoaded':
              this.updateCurrentView();
              break;
            case 'revealLine':
              this.revealLine(message.args[0], message.args[1]);
              break;
            case 'renderPlantuml':
              this.renderLocalPlantuml(message.args[0]);
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

      // Deprecated: Do not use, it be replaced by `webviewLoaded` custom message.
      // Update the content based on view changes
      // previewPanel.onDidChangeViewState(
      //   (e) => {
      //     if (previewPanel.visible) {
      //       this.updateCurrentView();
      //     }
      //   },
      //   null,
      //   this.context.subscriptions
      // );
    }

    this.generateHTML();
    if (!this.firstPreview) {
      this.firstPreview = true;
    }
  }

  public renderLocalPlantuml(data: any) {
    const uri: vscode.Uri = vscode.Uri.parse(data.sourceUri);
    data.context = this;
    plantumlAPI
      .render(
        data.count,
        data.code,
        path.dirname(uri.fsPath) +
        path.delimiter +
        path.resolve(__dirname, '../media/plantuml') +
        path.delimiter +
        path.resolve(__dirname, '../node_modules/plantuml-style-c4'),
        this.config.plantumlTheme
      )
      .then((svg: string) => {
        if (data.context.webpanel) {
          data.context.webpanel.webview.postMessage({
            command: 'responsePlantuml',
            id: data.id,
            name: data.name,
            response: svg
          });
        }
      })
      .catch((err: any) => {
        output.log(err)
      });
  }


  public async saveLocalHtml(
    htmlPath: string,
    doc: { type: string; content: string } | string,
    title: string,
    csstypes: { hasAbc: boolean; hasKatex: boolean; hasRailroad: boolean; hasSequence: boolean },
    styles: [],
    scripts: [{
      outer: [outerScript]|outerScript|undefined|null;
      id: string|undefined|null;
      code: string|undefined|null;
      inner: [innerScript]|innerScript|undefined|null
    }]
  ) {
    if (!title) {
      title = 'Preview Markdown File';
    }
    if (typeof doc === 'object') {
      if (typeof doc.content === 'string') {
        if (typeof doc.type === 'string') {
          switch (doc.type) {
            case 'zip':
              doc = zlibcodec.decode(doc.content);
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
      path.join(this.context.extensionPath, 'node_modules/@jhuix/showdowns/dist/showdowns.min.css'),
      {
        encoding: 'utf-8'
      }
    );

    let abcStyle = '';
    let katexStyle = '';
    let railroadStyle = '';
    let sequencesStyle = '';
    if (typeof csstypes === 'object') {
      if (csstypes.hasOwnProperty('hasAbc') && csstypes.hasAbc) {
        const abcCSS = await utils.readFile(
          path.join(this.context.extensionPath, 'node_modules/abcjs/abcjs-audio.css'),
          {
            encoding: 'utf-8'
          }
        );

        abcStyle = `<style type="text/css">${abcCSS}</style>`;
      }

      if (csstypes.hasOwnProperty('hasKatex') && csstypes.hasKatex) {
        const katexCSS = await utils.readFile(
          path.join(this.context.extensionPath, 'node_modules/katex/dist/katex.min.css'),
          {
            encoding: 'utf-8'
          }
        );

        katexStyle = `<style type="text/css">${katexCSS.replace(
          /url\(fonts/gi,
          'url(https://cdn.jsdelivr.net/npm/katex/dist/fonts'
        )}</style>`;
      }

      if (csstypes.hasOwnProperty('hasRailroad') && csstypes.hasRailroad) {
        const railroadCSS = await utils.readFile(
          path.join(this.context.extensionPath, 'node_modules/railroad-diagrams/railroad-diagrams.css'),
          {
            encoding: 'utf-8'
          }
        );

        railroadStyle = `<style type="text/css">${railroadCSS}</style>`;
      }

      if (csstypes.hasOwnProperty('hasSequence') && csstypes.hasSequence) {
        const sequencesCSS = await utils.readFile(
          path.join(
            this.context.extensionPath,
            'node_modules/@rokt33r/js-sequence-diagrams/dist/sequence-diagram-min.css'
          ),
          {
            encoding: 'utf-8'
          }
        );

        sequencesStyle = `<style type="text/css">${sequencesCSS.replace(/url\(([\s\S]*?)\)/gi, (match: string) => {
          return match.replace('danielbd', 'https://cdn.jsdelivr.net/npm/@rokt33r/js-sequence-diagrams/dist/danielbd');
        })}</style>`;
      }
    }

    let otherStyles = '';
    // Include custom CSS from cssPath if specified and file exists
    if (this.config.cssPath) {
      try {
        const customCss = await utils.readFile(this.config.cssPath, { encoding: 'utf-8' });
        otherStyles += `<style type="text/css">${customCss}</style>`;
      } catch (e) {
        // Ignore if file not found or error reading
      }
    }
    if (styles.length > 0) {
      for (let item of styles) {
        otherStyles = otherStyles + item;
      }
    }

    var scriptElements = '';
    if (scripts.length > 0) {
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (typeof script === 'object' && script.hasOwnProperty('outer') && script.outer) {
          if (!Array.isArray(script.outer)) {
            script.outer = [script.outer];
          }
          script.outer.forEach(o => {
            const src = o.src?.replace('vscode-webview:', 'https:');
            const name = o.name?.toLocaleLowerCase();
            scriptElements += `<script id='script-${name}' src='${src}'></script>`;
          });
        }
      }
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
      font-size: ${this.config.fontSize}px;
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
    <style type="text/css">${showdowncss}</style>${abcStyle}${katexStyle}${railroadStyle}${sequencesStyle}${otherStyles}
    ${scriptElements}
    </head>
    <body>
    <div class="workspace-container">${doc}</div>
    </body>
    </html>`;

    await utils.writeFile(htmlPath, html, {
      encoding: 'utf-8'
    });
  }

  public async openInBrowser(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    csstypes: { hasAbc: boolean; hasKatex: boolean; hasRailroad: boolean; hasSequence: boolean },
    styles: [],
    scripts: [{
      outer: [outerScript]|outerScript|undefined|null;
      id: string|undefined|null;
      code: string|undefined|null;
      inner: [innerScript]|innerScript|undefined|null
    }]
  ) {
    let dest = '';
    if (uri) {
      const srcUri = vscode.Uri.parse(uri);
      dest = srcUri.fsPath;
      const fsHash = crypto.createHash('md5');
      fsHash.update(dest);
      dest = path.join(path.resolve(os.tmpdir()), `mdsp-${fsHash.digest('hex')}.html`);
    } else {
      dest = path.join(path.resolve(os.tmpdir()), `mdsp-temp.html`);
    }
    await this.saveLocalHtml(dest, doc, title, csstypes, styles, scripts);

    const actionItem = localize(this.config.locale, 'msg.exploredir');
    vscode.window
      .showInformationMessage(localize(this.config.locale, 'msg.browsehtml', dest), actionItem)
      .then((act) => {
        if (act === actionItem) {
          utils.openFile(path.dirname(dest));
        }
      });
    utils.openFile(dest);
  }

  public async exportHTML(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    csstypes: { hasAbc: boolean; hasKatex: boolean; hasRailroad: boolean; hasSequence: boolean },
    styles: [],
    scripts: [{
      outer: [outerScript]|outerScript|undefined|null;
      id: string|undefined|null;
      code: string|undefined|null;
      inner: [innerScript]|innerScript|undefined|null
    }]
  ) {
    if (uri) {
      const srcUri = vscode.Uri.parse(uri);
      let dest = srcUri.fsPath;
      const extname = path.extname(dest);
      dest = dest.replace(new RegExp(extname + '$'), '.html');
      await this.saveLocalHtml(dest, doc, title, csstypes, styles, scripts);
      const actionItem = localize(this.config.locale, 'msg.exploredir');
      vscode.window
        .showInformationMessage(localize(this.config.locale, 'msg.createdfile', path.basename(dest), dest), actionItem)
        .then((act) => {
          if (act === actionItem) {
            utils.openFile(path.dirname(dest));
          }
        });
      utils.openFile(dest);
    }
  }

  public async exportChrome(
    doc: { type: string; content: string } | string,
    title: string,
    uri: string,
    csstypes: { hasAbc: boolean; hasKatex: boolean; hasRailroad: boolean; hasSequence: boolean },
    styles: [],
    scripts: [{
      outer: [outerScript]|outerScript|undefined|null;
      id: string|undefined|null;
      code: string|undefined|null;
      inner: [innerScript]|innerScript|undefined|null
    }],
    fileType = 'pdf'
  ) {
    if (!uri) return;

    const srcUri = vscode.Uri.parse(uri);
    let dest = srcUri.fsPath;
    const fsHash = crypto.createHash('md5');
    fsHash.update(dest);
    const htmlPath = path.join(path.resolve(os.tmpdir()), `mdsp-${fsHash.digest('hex')}.html`);
    await this.saveLocalHtml(htmlPath, doc, title, csstypes, styles, scripts);

    const extname = path.extname(dest);
    dest = dest.replace(new RegExp(extname + '$'), `.${fileType}`);

    let browser = null;
    let puppeteer = null;
    if (this.config.usePuppeteerCore) {
      puppeteer = require('puppeteer-core');
      if (!this.config.chromePath && process.platform === 'win32') {
        // First find setup path of chrome from HKLM
        await utils
          .regQuery('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe')
          .then((out: string) => {
            this.config.chromePath = out;
          })
          .catch((err: string) => {
            output.log(err);
          });
        if (!this.config.chromePath) {
          // Seconde find setup path of chrome from HKCU
          await utils
            .regQuery('HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe')
            .then((out: string) => {
              this.config.chromePath = out;
            })
            .catch((err: string) => {
              output.log(err);
            });
        }
      }
      browser = await puppeteer.launch({
        executablePath: this.config.chromePath || require('chrome-location'),
        headless: true
      });
    } else {
      const globalNodeModulesPath = (
        await utils.execFile(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'])
      )
        .trim()
        .split('\n')[0]
        .trim();
      puppeteer = require(path.resolve(globalNodeModulesPath, './puppeteer')); // trim() function here is very necessary.
      browser = await puppeteer.launch({
        headless: true
      });
    }
    if (!browser) return;

    const page = await browser.newPage();
    const loadPath = 'file:///' + htmlPath;
    await page.goto(loadPath);
    let puppeteerConfig = {
      path: dest,
      margin: {
        top: '1cm',
        bottom: '1cm',
        left: '1cm',
        right: '1cm'
      },
      printBackground: this.config.printBackground
    };
    // wait for timeout
    if (this.config.puppeteerWaitForTimeout && this.config.puppeteerWaitForTimeout > 0) {
      await page.waitFor(this.config.puppeteerWaitForTimeout);
    }
    if (fileType === 'pdf') {
      await page.pdf(puppeteerConfig);
    } else {
      await page.screenshot({ fullPage: true, ...puppeteerConfig });
    } // <= set to fullPage by default
    browser.close();
    const actionItem = localize(this.config.locale, 'msg.exploredir');
    vscode.window
      .showInformationMessage(localize(this.config.locale, 'msg.createdfile', path.basename(dest), dest), actionItem)
      .then((act) => {
        if (act === actionItem) {
          utils.openFile(path.dirname(dest));
        }
      });
    utils.openFile(dest);
  }
  /**
   * Close preview
   */
  public dispose() {
    let dir = path.resolve(__dirname, '../media/plantuml');
    if (this.uri) {
      dir += path.delimiter + path.dirname(this.uri.fsPath);
    }
    plantumlAPI.closeRender(dir);
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
      this.updateCurrentView();
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
         * when we switched text editor,
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

  public changeVisibleRanges(editor: vscode.TextEditor) {
    if (
      !this.config.scrollSync ||
      Date.now() < this.editorScrollDelay ||
      !editor.visibleRanges.length
    ) {
      // this.previewPostMessage({
      //   command: 'breakMessage'
      // });
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
      command: 'changeVisibleRanges',
      line: midLine
    });
  }

  private async generateHTML() {
    if (this.webpanel && this.uri) {
      this.webpanel.title = localize(this.config.locale, 'msg.previewfile', path.basename(this.uri.fsPath));
      await this.generateHTMLTemplate(this.uri, this.webpanel.webview);
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

  private async generateHTMLTemplate(uri: vscode.Uri, webview: vscode.Webview) {
    const title = path.basename(uri.fsPath, path.extname(uri.fsPath));

    let langMeta = '';
    if (this.config.locale !== 'en') {
      langMeta = `<meta http-equiv="Content-Language" content="${this.config.locale}">`;
    }

    let customCss = '';
    if (this.config.cssPath) {
      try {
        customCss = await utils.readFile(this.config.cssPath, { encoding: 'utf-8' });
      } catch (e) {
        // File not found or error reading, ignore or handle as needed
        customCss = '';
      }
    }

    webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">${langMeta}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style type="text/css">
  body {
    font-size: ${this.config.fontSize}px;
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
      `node_modules/@jhuix/showdowns/dist/showdowns.min.css`,
      true
    )}">
<link rel="stylesheet" href="${this.changeFileProtocol(webview, `media/contextmenu.css`, true)}">
<style type="text/css">${customCss}</style>
</head>
<body>
<script>
var markdown_flavor = "${this.options.flavor}";
var markdown_options = \`${JSON.stringify(this.options.markdown).replace(/\\/g, "\\\\")}\`;
var mermaid_options = \`${JSON.stringify(this.options.mermaid).replace(/\\/g, "\\\\")}\`;
var katex_options = \`${JSON.stringify(this.options.katex).replace(/\\/g, "\\\\")}\`;
var vega_options = \`${JSON.stringify(this.options.vega).replace(/\\/g, "\\\\")}\`;
var plantuml_rendermode = "${this.config.plantumlRenderMode}";
var plantuml_website = "${this.config.plantumlWebsite}";
var uri_path = "${path.dirname(uri.fsPath).replace(/\\/g, `/`)}";
var scheme_default = "${this.changeFileProtocol(webview, `node_modules/`, true)}";
var scheme_dist = "${this.changeFileProtocol(webview, `node_modules/@jhuix/showdowns/dist/`, true)}";
</script>
<script nonce="${this.getNonce()}" src="${this.changeFileProtocol(
      webview,
      `node_modules/@jhuix/showdowns/dist/showdowns.min.js`,
      true
    )}"></script>
<script nonce="${this.getNonce()}" src="${this.changeFileProtocol(webview, `media/webview.js`, true)}"></script>
</body>
</html>`;
  }

  private _objectIsEqual(first: Object | undefined | null, second: Object | undefined | null) {
    if (!first) {
      return !second;
    }

    if (!second) {
      return false;
    }

    const json1 = JSON.stringify(first);
    const json2 = JSON.stringify(second);
    return json1 === json2;
  }

  private _getChangedOptions(depth: boolean) {
    let options: {
      flavor: string,
      plantuml: Object,
      markdown: Object,
      mermaid: Object,
      katex: Object,
      vega: Object
    } = {
      flavor: this.config.flavor,
      plantuml: {},
      markdown: {},
      mermaid: {},
      katex: {},
      vega: {}
    };
    Object.assign(options.markdown, this.config.markdownOptions);
    Object.assign(options.plantuml, {
      renderMode: this.config.plantumlRenderMode,
      umlWebSite: this.config.plantumlWebsite
    });
    Object.assign(options.mermaid, this.config.mermaidOptions, { theme: this.config.mermaidTheme });
    Object.assign(options.katex, this.config.katexOptions, { mathDelimiters: this.config.mathDelimiters });
    Object.assign(options.vega, this.config.vegaOptions, { theme: this.config.vegaTheme });

    if (!this._objectIsEqual(this.options, options)) {
      if (depth) {
        if (options.flavor && options.flavor !== this.options.flavor) {
          this.options.flavor = options.flavor;
        }
        if (!this._objectIsEqual(options.plantuml, this.options.plantuml)) {
          this.options.plantuml = {};
          Object.assign(this.options.plantuml, options.plantuml);
        }
        if (!this._objectIsEqual(options.markdown, this.options.markdown)) {
          this.options.markdown = {};
          Object.assign(this.options.markdown, options.markdown);
        }
        if (!this._objectIsEqual(options.mermaid, this.options.mermaid)) {
          this.options.mermaid = {};
          Object.assign(this.options.mermaid, options.mermaid);
        }
        if (!this._objectIsEqual(options.katex, this.options.katex)) {
          this.options.katex = {};
          Object.assign(this.options.katex, options.katex);
        }
        if (!this._objectIsEqual(options.vega, this.options.vega)) {
          this.options.vega = {};
          Object.assign(this.options.vega, options.vega);
        }
      } else {
        this.options = {
          flavor: '',
          plantuml: {},
          markdown: {},
          mermaid: {},
          katex: {},
          vega: {}
        };
        Object.assign(this.options, options);
      }
      return options;
    }

    return null;
  }


  private async refreshPreview(previewPanel: vscode.WebviewPanel, uri: vscode.Uri) {
    const editor = this.getEditor();
    if (previewPanel && editor && editor.document && ShowdownPreviewer.isMarkdownFile(editor.document)) {
      let initialLine = this.currentLine;
      if (vscode.window.activeTextEditor && this.isSameUri(vscode.window.activeTextEditor.document.uri)) {
        initialLine = editor.selections[0].active.line || 0;
        if (editor.visibleRanges.length) {
          const topLine = editor.visibleRanges[0].start.line;
          const bottomLine = editor.visibleRanges[0].end.line;
          if (topLine === 0) {
            initialLine = 0;
          } else if (Math.floor(bottomLine) === editor.document.lineCount - 1) {
            initialLine = bottomLine;
          } else {
            initialLine = Math.floor((topLine + bottomLine) / 2);
          }
        }
        this.currentLine = initialLine;
      }
      const lines = editor.document.lineCount;
      const caption = path.basename(uri.fsPath, path.extname(uri.fsPath));
      const text = editor.document.getText();

      this.previewPostMessage({
        command: 'updateMarkdown',
        options: this._getChangedOptions(true),
        uri: uri.toString(),
        title: caption,
        totalLines: lines,
        currentLine: initialLine,
        markdown: text
      });
    }
  }
  private revealLine(uri: string, line: number) {
    if (!this.config.scrollSync) return;

    const sourceUri = vscode.Uri.parse(uri);
    vscode.window.visibleTextEditors
      .filter(
        (editor) => ShowdownPreviewer.isMarkdownFile(editor.document) && editor.document.uri.fsPath === sourceUri.fsPath
      )
      .forEach((editor) => {
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
    if (process.platform === 'win32') {
      pathString = pathString.replace(/^([a-zA-Z])\:\\/, (_, $1) => `${$1.toUpperCase()}:\\`);
    }
    return pathString;
  }
  private getProjectDirectoryPath(uri: vscode.Uri) {
    if (vscode.workspace.workspaceFolders === undefined) {
      return '';
    }

    const possibleWorkspaceFolders = vscode.workspace.workspaceFolders.filter((workspaceFolder) => {
      return path.dirname(uri.path.toUpperCase()).indexOf(workspaceFolder.uri.path.toUpperCase()) >= 0;
    });
    let projectDirectoryPath;
    if (possibleWorkspaceFolders.length) {
      // We pick the workspaceUri that has the longest path
      const workspaceFolder = possibleWorkspaceFolders.sort((x, y) => y.uri.fsPath.length - x.uri.fsPath.length)[0];
      projectDirectoryPath = workspaceFolder.uri.fsPath;
    } else {
      projectDirectoryPath = '';
    }
    return this.formatPathIfNecessary(projectDirectoryPath);
  }
  private getNonce() {
    let text = '';
    let size = 32;
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < size; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
