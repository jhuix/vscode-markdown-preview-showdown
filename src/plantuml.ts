/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as child_process from 'child_process';
import * as path from 'path';

const { debounce } = require('throttle-debounce');
const extensionDirectoryPath = path.resolve(__dirname, '../');
const PlantumlJarPath = path.resolve(extensionDirectoryPath, 'media/plantuml/plantuml.jar');

const STYLES: {
  [key: string]: string;
} = {
  default: '',
  nature: 'skin/nature.puml',
  c4: 'skin/c4.puml',
  'c4-handwrite': 'skin/c4-handwrite.puml'
};

const RENDERERS: {
  [key: string]: PlantumlRenderer | null;
} = {};

const CHUNKS: {
  [key: string]: string;
} = {};

const RESOLVES: {
  [key: string]: Array<(result: string) => void>;
} = {};

const CLOSE_RESOLVES: {
  [key: string]: Array<(result: string) => void>;
} = {};

class PlantumlRenderer {
  private fileDirectoryPath: string;
  private chunks: string;
  private resolves: Array<(result: string) => void>;
  private closeResolves: Array<(result: string) => void>;
  private render: child_process.ChildProcessWithoutNullStreams | null;
  private endRender = debounce(1000, (render: child_process.ChildProcessWithoutNullStreams) => {
    render.stdin.end();
  });

  public constructor(fileDirectoryPath: string) {
    this.fileDirectoryPath = fileDirectoryPath;
    this.chunks = CHUNKS[fileDirectoryPath] || '';
    this.resolves = RESOLVES[fileDirectoryPath] || [];
    this.closeResolves = CLOSE_RESOLVES[fileDirectoryPath] || [];
    this.render = null;
    this.startRender();
  }

  public generateSVG(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.render) {
        this.resolves.push(resolve);
        this.render.stdin.write(content + '\n');
        this.endRender(this.render);
      } else {
        reject('Task is not exist.');
      }
    });
  }

  public closeRender(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.render) {
        this.closeResolves.push(resolve);
        this.render.stdin.end();
      } else {
        reject('Task is not exist.');
      }
    });
  }

  private startRender() {
    this.render = child_process.spawn('java', [
      '-Djava.awt.headless=true',
      '-Dplantuml.include.path=' + this.fileDirectoryPath,
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

    this.render.on('error', () => this.exitRender());
    this.render.on('exit', () => this.exitRender());
  }

  /**
   * stop this.render and store this.chunks and this.resolves
   */
  private exitRender() {
    RENDERERS[this.fileDirectoryPath] = null;
    CHUNKS[this.fileDirectoryPath] = this.chunks;
    RESOLVES[this.fileDirectoryPath] = this.resolves;
    const callback = this.closeResolves.shift();
    if (callback) {
      callback('true');
    }
    CLOSE_RESOLVES[this.fileDirectoryPath] = this.closeResolves;
    this.render = null;
  }
}

// async call
export async function render(content: string, fileDirectoryPath: string, theme: string): Promise<string> {
  content = content.trim();
  let style = STYLES[theme];
  if (style && style !== '') {
    style = '!include ' + style;
  } else {
    style = '';
  }
  const startMatch = content.match(/^\s*\@startuml[ \t]*[\S]*\s+/g);
  if (startMatch) {
    if (!content.match(new RegExp(`^\\s*\\@enduml`, 'm'))) {
      content = '@startuml\n@enduml'; // error
    } else if (style !== '') {
      content = content.replace(/(^\s*\@startuml[ \t]*[\S]*\s+)([\S\s]+)/g, `$1 ${style}\n $2`);
    }
  } else {
    content = `@startuml
${style}
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

export function closeRender(fileDirectoryPath: string) {
  let renderer = RENDERERS[fileDirectoryPath];
  if (renderer) {
    renderer.closeRender();
  }
}
