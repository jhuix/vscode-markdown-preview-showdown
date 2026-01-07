/*
 * Copyright (c) 2020-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as vscode from 'vscode';

let out: vscode.OutputChannel;

function init() {
  if (!out) {
    out = vscode.window.createOutputChannel('MDPS Extension');
    out.show();
  }
}

function log(log: string) {
  init();

  function padding(num: number, length: number): string {
    return (Array(length).join('0') + num).slice(-length);
  }

  const date = new Date();
  out.appendLine(
    date.getFullYear() +
      '/' +
      padding(date.getMonth(), 2) +
      '/' +
      padding(date.getDate(), 2) +
      ' ' +
      padding(date.getHours(), 2) +
      ':' +
      padding(date.getMinutes(), 2) +
      ':' +
      padding(date.getSeconds(), 2) +
      '.' +
      padding(date.getMilliseconds(), 3) +
      ' ' +
      log
  );
}

function info(...logs: string[]) {
  log(logs.join());
}

function error(...logs: string[]) {
  log(logs.join());
}

export { log, info, error };
