/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */

(function (previewer, options) {
  function deepMerge(target, source) {
    let output = Object.assign({}, target);
    if (typeof source !== 'object' || !source) {
      return output;
    }
    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === 'object') {
        if (!output[key] || typeof output[key] !== 'object') {
          output[key] = Array.isArray(source[key]) ? [] : {};
        }
        output[key] = deepMerge(output[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }
  function initOptions(opts) {
    const defOptions = {
      vscode: false,
      autoToc: true,
      cdnName: 'local',
      defScheme: '',
      distScheme: '../node_modules/@jhuix/showdowns/dist/',
      uriPath: '',
      flavor: '',
      markdown: {},
      plantuml: {
        renderMode: 'local',
        umlWebSite: 'www.plantuml.com/plantuml'
      },
      mermaid: {},
      katex: {},
      kroki: {
        serverUrl: 'kroki.io'
      },
      toc: {},
      vega: {},
      tex: {},
      shiki: {},
      gnuplot: {}
    };
    return opts ? deepMerge(defOptions, opts) : defOptions;
  }

  options = initOptions(options);

  class ContextMenu {
    constructor(selector, menuItems) {
      const menus = document.createElement('ul');
      menus.classList.add('context-menu-list');
      menus.style.top = '-50%';
      menus.style.display = 'none';
      menus.style.zIndex = '1';
      this.menus = menus;
      this.selector = selector ? selector : document;
      this.cssLinks = [];
      this.scripts = [];
      this.initMenuItem(menuItems);
      document.body.appendChild(this.menus);
      this.initWindowEvents();
    }

    initWindowEvents() {
      const that = this;
      this.selector.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        that.show(event.clientX, event.clientY);
      });
      document.addEventListener('click', function (e) {
        that.hide();
      });
    }

    initMenuItem(menuItems) {
      if (typeof menuItems !== 'object' || !menuItems) return;

      if (menuItems.hasOwnProperty('style')) {
        for (const key in menuItems['style']) {
          this.menus.style[key] = menuItems['style'][key];
        }
      }

      if (menuItems.hasOwnProperty('items')) {
        const that = this;
        const items = menuItems.items;
        for (const index in items) {
          const item = items[index];
          const menu = document.createElement('li');
          menu.classList.add('context-menu-item');
          switch (item.type) {
            case 'menu':
              menu.appendChild(document.createElement('span')).appendChild(document.createTextNode(item.title));
              if (item.hasOwnProperty('onclick') && typeof item.onclick === 'function') {
                menu.addEventListener('click', (event) => {
                  item.onclick(event, that.selector);
                  that.hide();
                });
              }
              this.menus.appendChild(menu);
              break;
            case 'submenu':
              menu.classList.add('context-menu-submenu');
              menu.appendChild(document.createElement('span')).appendChild(document.createTextNode(item.title));
              this.menus.appendChild(menu);
              break;
            case 'separator':
              menu.classList.add('context-menu-separator');
              this.menus.appendChild(menu);
              break;
          }
        }
      }
    }

    show(x, y) {
      this.menus.style.display = 'block';
      if (y + this.menus.clientHeight > window.innerHeight - 10) {
        y -= this.menus.clientHeight + 10;
      }
      if (x + this.menus.clientWidth > window.innerWidth - 10) {
        x -= this.menus.clientWidth + 10;
      }
      x += window.pageXOffset;
      y += window.pageYOffset;
      this.menus.style.left = x + 'px';
      this.menus.style.top = y + 'px';
    }

    hide() {
      this.menus.style.display = 'none';
      this.menus.style.top = '-50%';
    }
  }

  var localizedMenu = {
    en: {
      'menu.browsehtml': 'Browse HTML Page',
      'menu.exporthtml': 'Export ➝ HTML',
      'menu.exportpdf': 'Export ➝ PDF',
      'menu.exportwebp': 'Export ➝ WEBP',
      'menu.exportpng': 'Export ➝ PNG',
      'menu.exportjpg': 'Export ➝ JPG'
    },
    'zh-cn': {
      'menu.browsehtml': '用浏览器打开',
      'menu.exporthtml': '导出文件 ➝ HTML',
      'menu.exportpdf': '导出文件 ➝ PDF',
      'menu.exportwebp': '导出文件 ➝ WEBP',
      'menu.exportpng': '导出图片 ➝ PNG',
      'menu.exportjpg': '导出图片 ➝ JPG'
    }
  };

  function localize(key) {
    let locale = document.children[0].lang;
    if (!locale) {
      locale = 'en';
    }
    return localizedMenu[locale][key] ? localizedMenu[locale][key] : '';
  }

  class PreviewHtml {
    //This PreviewHtml should be initialized when the html dom is loaded.
    constructor(isVscode) {
      this.vscodeAPI = null;
      this.sourceUri = '';
      this.totalLines = 0;
      this.currentLine = -1;
      this.syncScrollTop = -1;
      this.resolveCallbacks = {};
      this.config = {
        vscode: isVscode,
        options: {
          flavor: options.flavor,
          markdown: options.markdown,
          plantuml: options.plantuml,
          mermaid: options.mermaid,
          katex: options.katex,
          kroki: options.kroki,
          toc: options.toc,
          vega: options.vega,
          tex: options.tex,
          shiki: options.shiki,
          gnuplot: options.gnuplot
        }
      };

      const previewElement = document.createElement('div');
      previewElement.classList.add('workspace-container', 'main-toc-row');
      this.previewElement = previewElement;
      document.body.appendChild(this.previewElement);
      this.initWindowEvents();
      this.initMenus();
      let currPath = '';
      if (options.uriPath) {
        currPath = 'file:///' + options.uriPath;
        if (this.config.vscode) {
          const url = new URL(options.defScheme);
          currPath = url.origin + '/' + options.uriPath;
        }
      }
      this.config.options.kroki.svgRender = this.renderKroki.bind(this);
      this.config.options.tex.svgRender = this.renderTex.bind(this);
      this.config.options.gnuplot.svgRender = this.renderGnuplot.bind(this);
      previewer.setCDN(options.cdnName, options.defScheme, options.distScheme, currPath);
      previewer.onEvent('resetImagePath', this.resetImagePath.bind(this));
      previewer.init(true);
      this.updateOptions(this.config.options);
      if (!this.config.vscode) {
        window.dispatchEvent(
          new CustomEvent('showdownsLoaded', {
            detail: {
              phtml: this
            }
          })
        );
      } else {
        this.postMessage('webviewLoaded', [document.title]);
      }
    }

    updateOptions(options) {
      if (options.flavor) {
        previewer.setShowdownFlavor(options.flavor);
      }
      if (options.markdown) {
        previewer.setShowdownOptions(options.markdown);
      }
      if (options.vega) {
        previewer.setVegaOptions(Object.assign({ renderer: 'svg' }, options.vega));
      }
      if (options.mermaid) {
        previewer.setMermaidOptions(options.mermaid);
      }
      if (options.plantuml) {
        if (options.plantuml.renderMode === 'local') {
          previewer.setPlantumlOptions({ imageFormat: 'svg', svgRender: this.renderPlantuml.bind(this) });
        } else {
          previewer.setPlantumlOptions({ imageFormat: 'svg', umlWebSite: options.plantuml.umlWebSite });
        }
      }
      if (options.katex) {
        previewer.setKatexOptions(options.katex);
      }
      if (options.kroki) {
        previewer.setKrokiOptions(options.kroki);
      }
      if (options.toc) {
        previewer.setExtensionOptions('toc', options.toc);
      }
      if (options.shiki) {
        previewer.setExtensionOptions('shiki', options.shiki);
      }
      if (options.tex) {
        previewer.setExtensionOptions('tex', options.tex);
      }
      if (options.gnuplot) {
        previewer.setExtensionOptions('gnuplot', options.gnuplot);
      }
    }

    getOtherStyles() {
      let styles = [];
      const elVegaEmbedStyle = document.getElementById('vega-embed-style');
      if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
        let styleContent = elVegaEmbedStyle.innerHTML;
        styleContent = styleContent.replace(/\<br[\/]?\>/g, '');
        styles.push({
          id: 'vega-embed-style',
          style: styleContent
        });
      }
      const abcAudioStyle = document.getElementById('css-abc-audio');
      if (abcAudioStyle && abcAudioStyle.tagName.toLowerCase() === 'style') {
        let styleContent = abcAudioStyle.innerHTML;
        styleContent = styleContent.replace(/\<br[\/]?\>/g, '');
        styles.push({
          id: 'css-abc-audio',
          style: styleContent
        });
      }

      const mjxStyles = document.querySelectorAll(`[id^="MJX-"]`);
      if (mjxStyles.length > 0) {
        Array.from(mjxStyles).forEach((style) => {
          if (style.tagName.toLowerCase() === 'style') {
            let styleContent = style.innerHTML;
            styleContent = styleContent.replace(/\<br[\/]?\>/g, '');
            styles.push({
              id: style.id,
              style: styleContent
            });
          }
        })
      }
      return styles;
    }

    initMenus() {
      const that = this;
      const menuItems = {
        style: {
          zIndex: '1',
          display: 'none'
        },
        items: [
          {
            type: 'menu',
            title: localize('menu.browsehtml'),
            onclick: function (e, s) {
              that.postMessage('openInBrowser', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exporthtml'),
            onclick: function (e, s) {
              that.postMessage('exportHTML', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportpdf'),
            onclick: function (e, s) {
              that.postMessage('exportPDF', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportwebp'),
            onclick: function (e, s) {
              that.postMessage('exportWEBP', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportpng'),
            onclick: function (e, s) {
              that.postMessage('exportPNG', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportjpg'),
            onclick: function (e, s) {
              that.postMessage('exportJPEG', [
                that.getPreviewContent(s.innerHTML),
                document.title,
                that.sourceUri,
                that.cssLinks,
                that.getOtherStyles(),
                that.scripts
              ]);
            }
          }
        ]
      };

      this.contextMenu = new ContextMenu(this.previewElement, menuItems);
    }

    changeFileProtocol(html) {
      if (this.config.vscode) {
        html = html.replace(new RegExp(`(\<img.* src=")(.*?vscode-webview.*?)"`, `g`), function (match, tag, url) {
          let imgUrl = new URL(decodeURIComponent(url));
          imgUrl.protocol = 'file:';
          imgUrl.host = '';
          // url = imgUrl.toString().toLowerCase().replace("file:///" + uriPath.toLowerCase(), ".");
          url = imgUrl.toString();
          return tag + url + '"';
        });
        html = html.replace(
          new RegExp(`"([^"]*?file.*?\.vscode-resource\.vscode-cdn\.net\/)(.*?)"`, `g`),
          function (match, tag, url) {
            let imgUrl = new URL(decodeURIComponent(url));
            imgUrl.protocol = 'file:';
            imgUrl.host = '';
            url = imgUrl.toString();
            return '"' + url + '"';
          }
        );
      }
      return html.trim();
    }

    getPreviewContent(html) {
      const content = this.changeFileProtocol(html);
      const mjxCache = document.getElementById('MJX-SVG-global-cache');
      return mjxCache ? mjxCache.outerHTML + content : content;
    }

    /**
     * 
     * @param {string | HTMLElement[]} html 
     * @returns {string | HTMLElement[]}
     */
    changeVscodeResourceProtocol(html) {
      if (typeof html === 'string') {
        if (this.config.vscode) {
          const resUrl = new URL(options.defScheme);
          const vscodeResourceScheme = resUrl.origin + '/';
          html = html.replace(/(\<img.* src=")file:\/\/\//g, '$1' + vscodeResourceScheme);
          html = html.replace(/(\<img.* src=")(?![0-9a-zA-Z\-]+\:\/\/)/g, '$1' + vscodeResourceScheme + options.uriPath + '/');
        }
        return html.trim();
      }

      if (this.config.vscode) {
        const resUrl = new URL(options.defScheme);
        const vscodeResourceScheme = resUrl.origin + '/';
        const imgs = html[0].querySelectorAll('img');
        if (imgs && imgs.length > 0) {
          imgs.forEach((e) => {
            let result = e.outerHTML.match(/^\<img.* src="((?<![0-9a-zA-Z\-]+\:\/\/)[^"\:\s]+)"/);
            if (result && result.length > 1) {
              e.src = vscodeResourceScheme + options.uriPath + '/' + result[1];
              return;
            }

            result = e.outerHTML.match(/^\<img.* src="file:\/\/\/([^"]*)"/);
            if (result && result.length > 1) {
              e.src = vscodeResourceScheme + result[1];
            }
          });
        }
      }
      return html;
    }

    // Post message to parent window
    postMessage(command, args = []) {
      if (this.config.vscode) {
        if (!this.vscodeAPI) {
          // @ts-ignore
          this.vscodeAPI = acquireVsCodeApi();
        }
        // post message to vscode
        this.vscodeAPI.postMessage({
          command,
          args
        });
      } else {
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              command,
              args
            },
            'file://'
          );
        }
      }
    }

    resetImagePath(id, src, callback) {
      this.resolveCallbacks[id] = callback;
      this.postMessage('resetImagePath', [{ id: id, src: src, sourceUri: this.sourceUri }])
    }

    renderPlantuml(id, code, options) {
      const that = this;
      return new Promise((resolve, reject) => {
        that.resolveCallbacks[id] = { resolve, reject };
        that.postMessage('renderPlantuml', [{ id, code, options, sourceUri: that.sourceUri }]);
      });
    }

    renderKroki(id, code, options) {
      const that = this;
      return new Promise((resolve, reject) => {
        that.resolveCallbacks[id] = { resolve, reject };
        that.postMessage('renderKroki', [{ id, code, options, sourceUri: that.sourceUri }]);
      });
    }

    renderTex(id, code, options) {
      const that = this
      return new Promise((resolve, reject) => {
        that.resolveCallbacks[id] = { resolve, reject };
        that.postMessage('renderTex', [{ id, code, options, sourceUri: that.sourceUri }]);
      });
    }

    renderGnuplot(id, code) {
      const that = this
      return new Promise((resolve, reject) => {
        that.resolveCallbacks[id] = { resolve, reject };
        that.postMessage('renderGnuplot', [{ id, code, sourceUri: that.sourceUri }]);
      });
    }

    // Initialize `window` events.
    initWindowEvents() {
      // Keyboard events.
      window.addEventListener('keydown', (event) => {
        if (event.shiftKey && event.ctrlKey && event.which === 83) {
          // ctrl+shift+s preview sync source
          return this.previewSyncSource();
        }
      });
      window.addEventListener('scroll', (event) => {
        this.scrollEvent(event);
      });
      window.addEventListener('message', (event) => {
        this.messageEvent(event);
      });
    }

    updateMarkdown(markdown, mdOptions) {
      mdOptions = mdOptions || null;
      if (mdOptions instanceof Object) {
        this.config.options = mdOptions;
        this.updateOptions(mdOptions);
      }
      if (options.autoToc) {
        markdown = '[TOC]\n\n' + markdown;
      }

      const genScript = (script) => {
        if (script.once || !script.code) return;

        const s = {}
        if (typeof script.code === 'function') {
          s.code = `(${script.code.toString()})();`;
        } else {
          s.code = script.code;
        }
        if (script.id) {
          s.id = script.id;
        }
        if (script.host) {
          if (typeof script.host === 'string') {
            s.host = script.host;
          } else {
            s.host = script.host.id;
          }
        }
        if (script.module) {
          s.module = script.module;
        }
        return s;
      };
      const that = this;
      previewer
        .makeHtml({ content: markdown, output: 'dom' })
        .then((res) => {
          if (typeof res === 'object') {
            const preview = that.changeVscodeResourceProtocol(res.html);
            if (typeof preview === 'string') {
              that.previewElement.innerHTML = preview;
            } else {
              that.previewElement.replaceChildren();
              preview.forEach((e) => {
                that.previewElement.appendChild(e);
              });
            }
            that.scripts = [];
            that.cssLinks = [...res.cssLinks];
            previewer.completedHtml(res.scripts, '.showdowns');
            res.scripts.forEach((script) => {
              let s = genScript(script);
              if (script.inner && Array.isArray(script.inner)) {
                const inners = [];
                script.inner.forEach((inner) => {
                  const inScript = genScript(inner);
                  if (inScript) {
                    inners.push(inScript);
                  }
                });
                if (inners.length > 0) {
                  s = s ?? {};
                  s.inner = inners;
                }
              }

              if (script.outer && Array.isArray(script.outer)) {
                const outers = [];
                script.outer.forEach((outer) => {
                  outers.push(outer);
                });
                if (outers.length > 0) {
                  s = s ?? {};
                  s.outer = outers;
                }
              }
              if (s) {
                that.scripts.push(s);
              }
            });
          } else {
            that.scripts = [];
            that.cssLinks = [];
            that.previewElement.innerHTML = that.changeVscodeResourceProtocol(res);
          }
        })
        .catch((err) => {
          that.scripts = [];
          that.cssLinks = [];
          that.previewElement.innerHTML = '';
          console.log(err);
        });
    }

    messageEvent(event) {
      const message = event.data;
      if (message) {
        switch (message.command) {
          case 'updateMarkdown':
            this.sourceUri = message.uri;
            this.updateMarkdown(message.markdown, message.options);
            if (message.title) {
              document.title = message.title;
            }
            this.totalLines = message.totalLines;
            this.scrollToLine(message.currentLine);
            break;
          case 'changeVisibleRanges':
            const line = parseInt(message.line, 10);
            this.scrollToLine(line);
            break;
          case 'onResetImagePath':
            if (this.resolveCallbacks.hasOwnProperty(message.id)) {
              const callback = this.resolveCallbacks[message.id];
              delete this.resolveCallbacks[message.id];
              if (callback) {
                callback(message.response);
              }
            }
            break;
          case 'onRenderPlantuml':
          case 'onRenderGnuplot':
          case 'onRenderKroki':
          case 'onRenderTex':
            if (this.resolveCallbacks.hasOwnProperty(message.id)) {
              const callback = this.resolveCallbacks[message.id];
              delete this.resolveCallbacks[message.id];
              if (callback) {
                if (callback.resolve && message.response) {
                  callback.resolve(message.response);
                }
                if (callback.reject && message.error) {
                  callback.reject(message.error);
                }
              }
            }
            break;
        }
      }
    }

    checkScrollEnd() {
      this.syncScrollTop = -1;
      this.endScrollTimeout = null;
    }

    scrollEvent(event) {
      if (this.syncScrollTop >= 0) {
        if (this.endScrollTimeout) {
          clearTimeout(this.endScrollTimeout);
        }
        this.endScrollTimeout = setTimeout(this.checkScrollEnd.bind(this), 500);
      } else {
        this.previewSyncSource();
      }
    }

    previewSyncSource() {
      let scrollLine = 0;
      if (window.scrollY !== 0) {
        if (window.scrollY + window.innerHeight >= this.previewElement.scrollHeight) {
          scrollLine = this.totalLines;
        } else {
          const top = window.scrollY + window.innerHeight / 2;
          scrollLine = parseInt((top * this.totalLines) / this.previewElement.scrollHeight, 10);
        }
      }
      this.postMessage('revealLine', [this.sourceUri, scrollLine]);
    }

    scrollToLine(line) {
      if (line !== this.currentLine) {
        if (this.totalLines) {
          this.currentLine = line;
          let scrollTop = 0;
          if (line + 1 === this.totalLines) {
            scrollTop = this.previewElement.scrollHeight;
          } else {
            scrollTop = parseInt((line * this.previewElement.scrollHeight) / this.totalLines, 10);
          }

          if (window.scrollY !== scrollTop) {
            this.syncScrollTop = window.scrollY;
            window.scroll({
              left: 0,
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }

  function onLoad() {
    window.mdsp.phtml = new PreviewHtml(options.vscode);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onLoad);
  } else {
    onLoad();
  }
})(window.showdowns, window.mdsp && window.mdsp.options ? window.mdsp.options : {});
