/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import * as https from 'https';

function getFile(url: string) {
  return new Promise((resolve, reject) => {
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
exports.getFile = getFile;
function readFile(file: fs.PathLike | number, options: { encoding?: null; flag?: string } | undefined | null) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, options, (error, text) => {
      if (error) {
        return reject(error.toString());
      } else {
        return resolve(text.toString());
      }
    });
  });
}
exports.readFile = readFile;
function writeFile(file: fs.PathLike | number, text: any, options: fs.WriteFileOptions) {
  return new Promise((resolve, reject) => {
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
function write(fd: number, text: any) {
  return new Promise((resolve, reject) => {
    fs.write(fd, text, (error) => {
      if (error) {
        return reject(error.toString());
      } else {
        resolve(true);
      }
    });
  });
}
exports.write = write;
function execFile(
  file: string,
  args: ReadonlyArray<string> | undefined | null,
  options: childProcess.ExecFileOptionsWithBufferEncoding
) {
  return new Promise((resolve, reject) => {
    childProcess.execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error.toString());
      } else if (stderr) {
        return reject(stderr);
      } else {
        return resolve(stdout);
      }
    });
  });
}
exports.execFile = execFile;
function mkdir(dir: string) {
  return new Promise((resolve, reject) => {
    mkdirp(dir)
      .then((made) => {
        return resolve(made);
      })
      .catch((error) => {
        return reject(error);
      });
  });
}
exports.mkdirp = mkdir;
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
exports.openFile = openFile;

// Available only in win32 platform
function regQuery(key: string, valueName?: string) {
  return new Promise((resolve, reject) => {
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

exports.regQuery = regQuery;
