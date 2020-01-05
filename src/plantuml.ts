/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as child_process from 'child_process';
import * as path from 'path';

const extensionDirectoryPath = path.resolve(__dirname, '../');
const PlantumlJarPath = path.resolve(extensionDirectoryPath, 'media/plantuml/plantuml.jar');

const RENDERERS: {
  [key: string]: PlantumlRenderer | null;
} = {};

const CHUNKS: {
  [key: string]: string;
} = {};

const RESOLVES: {
  [key: string]: Array<(result: string) => void>;
} = {};

class PlantumlRenderer {
  private fileDirectoryPath: string;
  private chunks: string;
  private resolves: Array<(result: string) => void>;
  private render: child_process.ChildProcessWithoutNullStreams | null;

  public constructor(fileDirectoryPath: string) {
    this.fileDirectoryPath = fileDirectoryPath;
    this.chunks = CHUNKS[this.fileDirectoryPath] || '';
    this.resolves = RESOLVES[this.fileDirectoryPath] || [];
    this.render = null;
    this.startRender();
  }

  public generateSVG(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.render) {
        this.resolves.push(resolve);
        this.render.stdin.write(content + '\n');
        this.render.stdin.end();
      } else {
        reject('Task is not exist.');
      }
    });
  }

  private startRender() {
    this.render = child_process.spawn('java', [
      '-Djava.awt.headless=true',
      '-DPlantuml.include.path=' + this.fileDirectoryPath,
      '-jar',
      PlantumlJarPath,
      // '-graphvizdot', 'exe'
      '-pipe',
      '-tsvg',
      '-charset',
      'UTF-8'
    ]);

    this.render.stdout.on('data', (chunk) => {
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
              const callback = this.resolves.shift();
              if (callback) {
                callback('<?xml ' + diagram);
              }
            }
          });
        }
      }
    });

    this.render.on('error', () => this.closeRender());
    this.render.on('exit', () => this.closeRender());
  }

  /**
   * stop this.render and store this.chunks and this.resolves
   */
  private closeRender() {
    RENDERERS[this.fileDirectoryPath] = null;
    CHUNKS[this.fileDirectoryPath] = this.chunks;
    RESOLVES[this.fileDirectoryPath] = this.resolves;
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

  let renderer = RENDERERS[fileDirectoryPath];
  if (!renderer) {
    // init `Plantuml.jar` renderer
    renderer = new PlantumlRenderer(fileDirectoryPath);
    if (!renderer) return '';
    RENDERERS[fileDirectoryPath] = renderer;
  }
  return await renderer.generateSVG(content);
}
