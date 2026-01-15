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

export interface TexRenderOptions {
  build: string;
  zoom?: number;
}

const buildTypes = ['pdflatex', 'xelatex', 'lualatex'];

class TexRenderer {
  private texFile: string;
  private texPath: string;
  private dviFile: string;
  private chunks: string;
  private options: TexRenderOptions;
  private render: childProcess.ChildProcessWithoutNullStreams | null;

  public constructor(texFilePath: string, options?: TexRenderOptions) {
    this.texPath = path.dirname(texFilePath);
    this.texFile = path.basename(texFilePath);
    this.chunks = '';
    options = options ?? { build: 'pdflatex' };
    if (!options.build || !buildTypes.includes(options.build)) {
      options.build = 'pdflatex';
    }
    this.options = options;
    if (options.build === 'xelatex') {
      this.dviFile = this.texFile.replace(/\.tex$/i, '.xdv');
    } else {
      this.dviFile = this.texFile.replace(/\.tex$/i, '.dvi');
    }
    this.render = null;
  }

  public isActivated(): boolean {
    return !!this.render;
  }

  public async generateSVG(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // pdflatex.exe -interaction=nonstopmode --output-format=dvi file.tex -> file.dvi
      // lualatex.exe -interaction=nonstopmode --output-format=dvi file.tex -> file.dvi
      // xelatex.exe -interaction=nonstopmode -no-pdf file.tex -> file.xdv
      this.render = childProcess.spawn(
        this.options.build,
        ['-interaction=nonstopmode', '--output-format=dvi', '-no-pdf', this.texFile],
        {
          cwd: this.texPath
        }
      );

      this.render.on('error', (error: Error) => {
        output.error('Tex Renderer Error:', error.message);
        this.render = null;
        this.closeRender();
        reject(error);
      });

      this.render.on('close', (code: number, signal: string) => {
        output.log(`Tex Renderer Closed: code=${code}, signal=${signal}`);
        // dvisvgm.exe -p- --no-merge --font-format=woff2 --zoom=1.0 -s file.dvi | file.xdv
        const params: string[] = ['-p-', '--no-merge', '--font-format=woff2'];
        if (this.options.zoom && this.options.zoom > 0) {
          params.push(`--zoom=${this.options.zoom}`);
        }
        params.push('-s');
        params.push(this.dviFile);
        this.render = childProcess.spawn('dvisvgm', params, {
          cwd: this.texPath
        });

        this.render.stdout.on('data', (data: Buffer) => {
          this.chunks += data.toString();
        });

        this.render.on('error', (error: Error) => {
          output.error('DVI to SVG Converter Error:', error.message);
          this.render = null;
          this.closeRender();
          reject(error);
        });

        this.render.on('close', (code: number, signal: string) => {
          output.log(`DVI to SVG Converter Closed: code=${code}, signal=${signal}`);
          const svgData = this.chunks;
          this.render = null;
          fs.rmdirSync(this.texPath, { recursive: true });
          this.closeRender();
          resolve(svgData);
        });
      });
    });
  }

  public closeRender(): void {
    if (this.render) {
      this.render.kill();
      this.render = null;
    }
    this.chunks = '';
    this.dviFile = '';
    this.texFile = '';
    this.texPath = '';
  }
}

export { TexRenderer };
// async call
export function render(id: string, content: string, options?: TexRenderOptions): TexRenderer {
  content = content.trim();
  const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'tex-'));
  const texFile = path.join(tmpPath, `${id}.tex`);
  fs.writeFileSync(texFile, content, 'utf-8');
  return new TexRenderer(texFile, options);
}

export function closeRender(renderer: TexRenderer) {
  if (renderer) {
    renderer.closeRender();
  }
}
