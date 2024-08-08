/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
import * as path from 'path';
import * as vscode from 'vscode';

export class PreviewConfig {
  public static packageName: string;
  public static defaultFontSize = 14;

  public static getCurrentConfig(context: vscode.ExtensionContext) {
    return new PreviewConfig(context);
  }

  public static getData<T>(data: T | undefined, defaultValue: T): T {
    return typeof data === 'undefined' ? defaultValue : data;
  }

  public locale: string;
  public autoPreview: boolean;
  public fontSize: number;
  public scrollSync: boolean;
  public flavor: string;
  public mermaidTheme: string;
  public vegaTheme: string;
  public plantumlTheme: string;
  public plantumlRenderMode: string;
  public plantumlWebsite: string;
  public usePuppeteerCore: boolean;
  public puppeteerWaitForTimeout: number;
  public chromePath: string;
  public printBackground: boolean;
  public mathDelimiters: {
    texmath: {
      display: Array<Object>,
      inline: Array<Object>
    },
    asciimath: {
      display: Array<Object>,
      inline: Array<Object>
    }
  };
  public markdownOptions: Object;
  public mermaidOptions: Object;
  public katexOptions: Object;
  public vegaOptions: Object;

  public constructor(context: vscode.ExtensionContext) {
    this.printBackground = false;
    this.locale = 'en';
    // Get gurrent localization id, default 'en'.
    if (typeof process.env.VSCODE_NLS_CONFIG === 'string') {
      const vscodeOptions = JSON.parse(process.env.VSCODE_NLS_CONFIG);
      if (vscodeOptions.hasOwnProperty('locale') && vscodeOptions.locale) {
        this.locale = vscodeOptions.locale.toLowerCase();
      }
    }
    if (context) {
      PreviewConfig.packageName = require(path.resolve(context.extensionPath, 'package.json')).name;
      const config = vscode.workspace.getConfiguration(PreviewConfig.packageName);

      this.autoPreview = PreviewConfig.getData(config.get('autoPreview'), true);
      this.scrollSync = PreviewConfig.getData(config.get('scrollSync'), true);
      this.fontSize = PreviewConfig.getData(config.get('fontSize'), Math.pow(8, 5));
      this.mermaidTheme = PreviewConfig.getData(config.get('mermaid.theme'), 'default');
      this.mermaidOptions = PreviewConfig.getData(config.get('mermaid.options'), {});
      this.vegaTheme = PreviewConfig.getData(config.get('vega.theme'), 'vox');
      this.vegaOptions = PreviewConfig.getData(config.get('vega.options'), {});
      this.plantumlTheme = PreviewConfig.getData(config.get('plantuml.theme'), 'default');
      this.flavor = PreviewConfig.getData(config.get('flavor'), 'github');
      this.markdownOptions = PreviewConfig.getData(config.get('markdown.options'), {});
      this.plantumlRenderMode = PreviewConfig.getData(config.get('plantuml.renderMode'), 'local');
      this.plantumlWebsite = PreviewConfig.getData(config.get('plantuml.website'), 'www.plantuml.com/plantuml');
      this.chromePath = PreviewConfig.getData(config.get('puppeteer.chromePath'), '');
      this.usePuppeteerCore = PreviewConfig.getData(config.get('puppeteer.useCore'), this.chromePath ? true : false);
      this.puppeteerWaitForTimeout = PreviewConfig.getData(config.get('puppeteer.waitForTimeout'), 0);
      this.katexOptions = PreviewConfig.getData(config.get('katex.options'), {});
      const mathDelimiters = PreviewConfig.getData(config.get('katex.mathDelimiters'), {
        latexInline: "",
        latexDisplay: "",
        asciiInline: "",
        asciiDisplay: ""
      });
      this.mathDelimiters = {
        texmath: {
          display: [],
          inline: []
        },
        asciimath: {
          display: [],
          inline: []
        }
      };
      try {
        this.mathDelimiters.texmath.inline = JSON.parse('[' + mathDelimiters.latexInline + ']');
      } catch {
        this.mathDelimiters.texmath.inline = [];
      }
      if (this.mathDelimiters.texmath.inline.length === 0) {
        this.mathDelimiters.texmath.inline = [
          { left: '\\(', right: '\\)' }
        ];
      }

      try {
        this.mathDelimiters.texmath.display = JSON.parse('[' + mathDelimiters.latexDisplay + ']');
      } catch {
        this.mathDelimiters.texmath.display = [];
      }
      if (this.mathDelimiters.texmath.display.length === 0) {
        this.mathDelimiters.texmath.display = [
          { left: '$$', right: '$$' },
          { left: '\\[', right: '\\]' },
          { left: "\\begin{equation}", right: "\\end{equation}" },
          { left: "\\begin{align}", right: "\\end{align}" },
          { left: "\\begin{alignat}", right: "\\end{alignat}" },
          { left: "\\begin{gather}", right: "\\end{gather}" },
          { left: "\\begin{CD}", right: "\\end{CD}" }              
        ];
      }

      try {
        this.mathDelimiters.asciimath.inline = JSON.parse('[' + mathDelimiters.asciiInline + ']');
      } catch {
        this.mathDelimiters.asciimath.inline = [];
      }
      if (this.mathDelimiters.asciimath.inline.length === 0) {
        this.mathDelimiters.asciimath.inline = [
          { left: '\\$', right: '\\$' }
        ];
      }

      try {
        this.mathDelimiters.asciimath.display = JSON.parse('[' + mathDelimiters.asciiDisplay + ']');
      } catch {
        this.mathDelimiters.asciimath.display = [];
      }
      if (this.mathDelimiters.asciimath.display.length === 0) {
        this.mathDelimiters.asciimath.display = [
          { left: '@@', right: '@@' }
        ];
      }
    } else {
      this.autoPreview = false;
      this.fontSize = PreviewConfig.defaultFontSize;
      this.scrollSync = true;
      this.flavor = 'github';
      this.mermaidTheme = 'default';
      this.vegaTheme = 'vox';
      this.plantumlTheme = 'default';
      this.plantumlRenderMode = 'local';
      this.plantumlWebsite = 'www.plantuml.com/plantuml';
      this.usePuppeteerCore = false;
      this.puppeteerWaitForTimeout = 0;
      this.chromePath = '';
      this.mathDelimiters = {
        texmath: {
          display: [],
          inline: []
        },
        asciimath: {
          display: [],
          inline: []
        }
      };
      this.markdownOptions = {};
      this.mermaidOptions = {};
      this.katexOptions = {};
      this.vegaOptions = {};
    }
  }

  public isEqualTo(otherConfig: PreviewConfig) {
    const json1 = JSON.stringify(this);
    const json2 = JSON.stringify(otherConfig);
    return json1 === json2;
  }
}
