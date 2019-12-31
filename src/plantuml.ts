/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';

const extensionDirectoryPath = path.resolve(__dirname, '../');
const PlantumlJarPath = path.resolve(extensionDirectoryPath, 'media/plantuml/plantuml.jar');

const TASKS: {
  [key: string]: PlantumlTask | null;
} = {};

const CHUNKS: {
  [key: string]: string;
} = {};

const CALLBACKS: {
  [key: string]: Array<(result: string) => void>;
} = {};

class PlantumlTask {
  private fileDirectoryPath: string;
  private chunks: string;
  private callbacks: Array<(result: string) => void>;
  private task: child_process.ChildProcessWithoutNullStreams | null;

  public constructor(fileDirectoryPath: string) {
    this.fileDirectoryPath = fileDirectoryPath;
    this.chunks = CHUNKS[this.fileDirectoryPath] || '';
    this.callbacks = CALLBACKS[this.fileDirectoryPath] || [];
    this.task = null;
    this.startTask();
  }

  public generateSVG(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.task) {
        this.callbacks.push(resolve);
        this.task.stdin.write(content + '\n');
        this.task.stdin.end();
      } else {
        reject('Task is not exist.');
      }
    });
  }

  private startTask() {
    this.task = child_process.spawn('java', [
      '-Djava.awt.headless=true',
      '-DPlantuml.include.path=' + [this.fileDirectoryPath, path.resolve(os.homedir(), '.mdps')].join(path.delimiter),
      '-jar',
      PlantumlJarPath,
      // '-graphvizdot', 'exe'
      '-pipe',
      '-tsvg',
      '-charset',
      'UTF-8'
    ]);

    this.task.stdout.on('data', (chunk) => {
      let data: string = chunk.toString();
      this.chunks += data;
      if (this.chunks.trimRight().endsWith('</svg>')) {
        const prefixs = this.chunks.match(/<svg/g);
        const endfixs = this.chunks.match(/<\/svg>/g);
        if (prefixs && endfixs && prefixs.length === endfixs.length) {
          data = this.chunks;
          this.chunks = ''; // clear CHUNKS
          const diagrams = data.split('<?xml ');
          diagrams.forEach((diagram, i) => {
            if (diagram.length) {
              const callback = this.callbacks.shift();
              if (callback) {
                callback('<?xml ' + diagram);
              }
            }
          });
        }
      }
    });

    this.task.on('error', () => this.closeSelf());
    this.task.on('exit', () => this.closeSelf());
  }

  /**
   * stop this.task and store this.chunks and this.callbacks
   */
  private closeSelf() {
    TASKS[this.fileDirectoryPath] = null;
    CHUNKS[this.fileDirectoryPath] = this.chunks;
    CALLBACKS[this.fileDirectoryPath] = this.callbacks;
  }
}

// async call
export async function render(content: string, fileDirectoryPath = ''): Promise<string> {
  content = content.trim();
  const startMatch = content.match(/^\@start(.+?)\s+/m);
  if (startMatch) {
    if (!content.match(/^\s+\@enduml/m)) {
      content = '@startuml\n@enduml'; // error
    }
  } else {
    content = `@startuml
${content}
@enduml`;
  }

  let task = TASKS[fileDirectoryPath];
  if (!task) {
    // init `Plantuml.jar` task
    TASKS[fileDirectoryPath] = new PlantumlTask(fileDirectoryPath);
    task = TASKS[fileDirectoryPath];
  }
  return await task.generateSVG(content);
}
