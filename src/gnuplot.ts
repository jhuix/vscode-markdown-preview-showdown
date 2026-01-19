/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
'use strict';

import * as childProcess from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as output from './output';

class GnuplotRenderer {
  private plotFile: string;
  private plotPath: string;
  private chunks: string;
  private render: childProcess.ChildProcessWithoutNullStreams | null;

  public constructor(plotFilePath: string) {
    this.plotPath = path.dirname(plotFilePath);
    this.plotFile = path.basename(plotFilePath);
    this.chunks = '';
    this.render = null;
  }

  public isActivated(): boolean {
    return !!this.render;
  }

  public async generateSVG(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // gnuplot scriptfile plot.dem -> svg
      this.render = childProcess.spawn('gnuplot', ['-c', this.plotFile], {
        cwd: this.plotPath
      });

      this.render.stdout.on('data', (data: Buffer) => {
        this.chunks += data.toString();
      });
      this.render.on('error', (error: Error) => {
        output.error('Gnuplot Renderer Error:', error.message);
        this.render = null;
        this.closeRender();
        reject(error);
      });
      this.render.on('close', (code: number, signal: string) => {
        output.log(`Gnuplot to SVG Converter Closed: code=${code}, signal=${signal}`);
        const svgData = this.chunks;
        this.render = null;
        fs.rmSync(this.plotPath, { recursive: true });
        this.closeRender();
        resolve(svgData);
      });
    });
  }

  public closeRender(): void {
    if (this.render) {
      this.render.kill();
      this.render = null;
    }
    this.chunks = '';
    this.plotFile = '';
    this.plotPath = '';
  }
}

export { GnuplotRenderer };
// async call
export function render(id: string, content: string): GnuplotRenderer {
  content = content.trim();
  const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gnuplot-'));
  const plotFile = path.join(tmpPath, `${id}.dem`);
  fs.writeFileSync(plotFile, content, 'utf-8');
  return new GnuplotRenderer(plotFile);
}

export function closeRender(renderer: GnuplotRenderer) {
  if (renderer) {
    renderer.closeRender();
  }
}
