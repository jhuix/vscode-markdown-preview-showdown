const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const production = process.argv.includes('--production') || process.argv.includes('--omit=dev');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build web started');
      // 构建前删除输出文件
      const files = ['webview.js', 'webview.js.map', 'contextmenu.css', 'contextmenu.css.map'];
      files.forEach((file) => {
        const deletedFile = path.join(__dirname, 'media', file);
        if (fs.existsSync(deletedFile)) {
          fs.unlinkSync(deletedFile);
          console.log('[watch] deleted file:', deletedFile);
        }
      });
    });
    build.onEnd((result) => {
      // 构建后复制输出文件
      const files = ['webview.js', 'contextmenu.css'];
      files.forEach((file) => {
        const destPath = path.join(__dirname, 'docs', 'media', file);
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        const srcPath = path.join(__dirname, 'media', file);
        fs.copyFileSync(srcPath, destPath);
        console.log('[watch] copied file from', srcPath, 'to', destPath);
      });
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build web finished');
    });
  }
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/media/webview.js', 'src/media/contextmenu.css'],
    bundle: true,
    minify: production,
    sourcemap: true,
    sourcesContent: false,
    sourceRoot: '../src',
    platform: 'browser',
    outbase: 'src/media',
    outdir: 'media',
    allowOverwrite: true,
    external: ['vscode', 'dom'],
    logLevel: 'silent',
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin
    ]
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
