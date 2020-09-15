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

  public locale: string;
  public autoPreview: boolean;
  public fontSize: number;
  public scrollSync: boolean;
  public maxContentSize: number;
  public mermaidTheme: string;
  public vegaTheme: string;
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

      let temp: boolean | undefined = config.get('autoPreview');
      this.autoPreview = typeof temp === 'undefined' ? true : temp;

      temp = config.get('scrollSync');
      this.scrollSync = typeof temp === 'undefined' ? true : temp;

      let tempNumber: number | undefined = config.get('maxContentSize');
      this.maxContentSize = typeof tempNumber === 'undefined' ? Math.pow(8, 5) : tempNumber;

      tempNumber = config.get('fontSize');
      this.fontSize = typeof tempNumber === 'undefined' ? Math.pow(8, 5) : tempNumber;

      let tmpStr: string | undefined = config.get('mermaidTheme');
      this.mermaidTheme = typeof tmpStr === 'undefined' ? '' : tmpStr;

      tmpStr = config.get('vegaTheme');
      this.vegaTheme = typeof tmpStr === 'undefined' ? 'local' : tmpStr;

      tmpStr = config.get('plantumlRenderMode');
      this.plantumlRenderMode = typeof tmpStr === 'undefined' ? '' : tmpStr;

      tmpStr = config.get('plantumlWebsite');
      this.plantumlWebsite = typeof tmpStr === 'undefined' ? 'www.plantuml.com/plantuml' : tmpStr;

      tmpStr = config.get('chromePath');
      this.chromePath = typeof tmpStr === 'undefined' ? '' : tmpStr;

      temp = config.get('usePuppeteerCore');
      this.usePuppeteerCore = typeof temp !== 'undefined' ? temp : this.chromePath ? true : false;

      const tmpNum: number | undefined = config.get('puppeteerWaitForTimeout');
      this.puppeteerWaitForTimeout = typeof tmpNum === 'undefined' ? 0 : tmpNum;
    } else {
      this.autoPreview = false;
      this.fontSize = PreviewConfig.defaultFontSize;
      this.scrollSync = true;
      this.maxContentSize = Math.pow(8, 5);
      this.mermaidTheme = 'default';
      this.vegaTheme = 'vox';
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
