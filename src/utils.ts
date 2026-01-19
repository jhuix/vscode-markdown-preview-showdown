/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as childProcess from 'child_process';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import * as https from 'https';

function requestText(url: string | URL, body: string, options: https.RequestOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const req = https
      .request(url, options, (res) => {
        let data = '';
        if (!res.statusCode || res.statusCode < 200 || res.statusCode > 299) {
          reject(`Request Failed. Status Code: ${res.statusCode}-${res.statusMessage}`);
          return;
        }

        // 接收数据
        res.on('data', (d) => {
          data += d;
        });

        // 完成接收数据
        res.on('end', () => {
          resolve(data);
        });
      })
      .on('error', (err) => {
        reject('Error: ' + err.message);
      });
    req.write(body);
    req.end();
  });
}

function getFile(url: string | URL): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = '';
        if (response.statusCode !== 200) {
          reject(`Request Failed. Status Code: ${response.statusCode}`);
          return;
        }

        // 接收数据
        response.on('data', (d) => {
          data += d;
        });

        // 完成接收数据
        response.on('end', () => {
          resolve(data);
        });
      })
      .on('error', (err) => {
        reject('Error: ' + err.message);
      });
  });
}

function readFile(
  file: fs.PathLike | number,
  options: { encoding: BufferEncoding; flag?: string | undefined } | BufferEncoding
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, options, (error, text) => {
      if (error) {
        return reject(error.toString());
      } else {
        return resolve(text.toString());
      }
    });
  });
}

function writeFile(file: fs.PathLike | number, text: any, options: fs.WriteFileOptions): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.writeFile(file, text, options, (error) => {
      if (error) {
        return reject(error.toString());
      } else {
        resolve(true);
      }
    });
  });
}
exports.writeFile = writeFile;
function write(fd: number, text: any): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.write(fd, text, (error) => {
      if (error) {
        return reject(error.toString());
      } else {
        resolve(true);
      }
    });
  });
}

function execFile(
  file: string,
  args: ReadonlyArray<string> | undefined | null,
  options?: childProcess.ExecFileOptionsWithBufferEncoding
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    childProcess.execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error.toString());
      } else if (stderr) {
        if (typeof stderr === 'string') {
          return resolve(stderr);
        }

        return reject(stderr.toString());
      } else {
        if (typeof stdout === 'string') {
          return resolve(stdout);
        }

        return resolve(stdout.toString());
      }
    });
  });
}

function mkdir(dir: string): Promise<string | void | undefined> {
  return new Promise<string | void | undefined>((resolve, reject) => {
    mkdirp(dir)
      .then((made) => {
        return resolve(made);
      })
      .catch((error) => {
        return reject(error);
      });
  });
}

/**
 * open html file in browser or open pdf file in reader ... etc
 * @param filePath string
 */
function openFile(filePath: string) {
  if (process.platform === 'win32') {
    if (filePath.match(/^[a-zA-Z]:\\/)) {
      // C:\ like url.
      filePath = 'file:///' + filePath;
    }
    if (filePath.startsWith('file:///')) {
      return childProcess.execFile('explorer.exe', [filePath]);
    } else {
      return childProcess.exec(`start ${filePath}`);
    }
  } else if (process.platform === 'darwin') {
    childProcess.execFile('open', [filePath]);
  } else {
    childProcess.execFile('xdg-open', [filePath]);
  }
}

// Available only in win32 platform
function regQuery(key: string, valueName?: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const cmd = `REG QUERY \"${key}\"` + (valueName ? ` /v ${valueName}` : ' /ve');
    childProcess.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(error.toString());
      } else if (stderr) {
        return reject(stderr);
      } else {
        let outs = stdout.trim().split('\r\n');
        if (outs.length < 2) {
          return resolve('');
        }
        outs = outs[1].trim().replace(/ +/g, ' ').split(' ');
        return resolve(outs.length > 2 ? outs.slice(2).join(' ') : '');
      }
    });
  });
}

const utils = {
  requestText,
  getFile,
  readFile,
  writeFile,
  write,
  execFile,
  mkdirp: mkdir,
  openFile,
  regQuery
};

export default utils;
