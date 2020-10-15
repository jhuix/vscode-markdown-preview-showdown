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
  public latexmathInlineDelimiters: Array<Object>;
  public latexmathDisplayDelimiters: Array<Object>;
  public asciimathInlineDelimiters: Array<Object>;
  public asciimathDisplayDelimiters: Array<Object>;
  public mermaidTheme: string;
  public vegaTheme: string;
  public plantumlTheme: string;
  public plantumlRenderMode: string;
  public plantumlWebsite: string;
  public usePuppeteerCore: boolean;
  public puppeteerWaitForTimeout: number;
  public chromePath: string;
  public printBackground: boolean;

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
      this.mermaidTheme = PreviewConfig.getData(config.get('mermaidTheme'), 'default');
      this.vegaTheme = PreviewConfig.getData(config.get('vegaTheme'), 'vox');
      this.plantumlTheme = PreviewConfig.getData(config.get('plantumlTheme'), 'default');
      this.flavor = PreviewConfig.getData(config.get('flavor'), 'github');
      this.plantumlRenderMode = PreviewConfig.getData(config.get('plantumlRenderMode'), 'local');
      this.plantumlWebsite = PreviewConfig.getData(config.get('plantumlWebsite'), 'www.plantuml.com/plantuml');
      this.chromePath = PreviewConfig.getData(config.get('chromePath'), '');
      this.usePuppeteerCore = PreviewConfig.getData(config.get('usePuppeteerCore'), this.chromePath ? true : false);
      this.puppeteerWaitForTimeout = PreviewConfig.getData(config.get('puppeteerWaitForTimeout'), 0);
      try {
        this.latexmathInlineDelimiters = JSON.parse('[' + PreviewConfig.getData(config.get('latexmathInlineDelimiters'), '') + ']');
      }catch{
        this.latexmathInlineDelimiters = [];
      }
      try {
        this.latexmathDisplayDelimiters = JSON.parse('[' + PreviewConfig.getData(config.get('latexmathDisplayDelimiters'), '') + ']');
      }catch{
        this.latexmathDisplayDelimiters = [];
      }
      try {
        this.asciimathInlineDelimiters = JSON.parse('[' + PreviewConfig.getData(config.get('asciimathInlineDelimiters'), '') + ']');
      }catch{
        this.asciimathInlineDelimiters = [];
      }
      try {
        this.asciimathDisplayDelimiters = JSON.parse('[' + PreviewConfig.getData(config.get('asciimathDisplayDelimiters'), '') + ']');
      }catch{
        this.asciimathDisplayDelimiters = [];
      }
    } else {
      this.autoPreview = false;
      this.fontSize = PreviewConfig.defaultFontSize;
      this.scrollSync = true;
      this.flavor = 'github';
      this.latexmathInlineDelimiters = [];
      this.latexmathDisplayDelimiters = [];
      this.asciimathInlineDelimiters = [];
      this.asciimathDisplayDelimiters = [];
      this.mermaidTheme = 'default';
      this.vegaTheme = 'vox';
      this.plantumlTheme = 'default';
      this.plantumlRenderMode = 'local';
      this.plantumlWebsite = 'www.plantuml.com/plantuml';
      this.usePuppeteerCore = false;
      this.puppeteerWaitForTimeout = 0;
      this.chromePath = '';
    }
  }

  public isEqualTo(otherConfig: PreviewConfig) {
    const json1 = JSON.stringify(this);
    const json2 = JSON.stringify(otherConfig);
    return json1 === json2;
  }
}
