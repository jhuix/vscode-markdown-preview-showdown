/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */

(function (previewer, options) {
  function hashString(str) {
    const seed = 31;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (Math.imul(seed, hash) + char) | 0;
    }
    return hash >>> 0;
  }

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
      vega: {}
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
          vega: options.vega
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
      previewer.setCDN(options.cdnName, options.defScheme, options.distScheme, currPath);
      this.updateOptions(this.config.options);
      previewer.init(true);
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
                that.changeFileProtocol(s.innerHTML),
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
                that.changeFileProtocol(s.innerHTML),
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
                that.changeFileProtocol(s.innerHTML),
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
                that.changeFileProtocol(s.innerHTML),
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
                that.changeFileProtocol(s.innerHTML),
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
                that.changeFileProtocol(s.innerHTML),
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

    changeVscodeResourceProtocol(html) {
      if (this.config.vscode) {
        const resUrl = new URL(options.defScheme);
        const vscodeResourceScheme = resUrl.origin + '/';
        html = html.replace(/(\<img.* src=")file:\/\/\//g, '$1' + vscodeResourceScheme);
        html = html.replace(/(\<img.* src=")\.\//g, '$1' + vscodeResourceScheme + options.uriPath + '/');
      }
      return html.trim();
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

    renderPlantuml(id, name, code, count) {
      count = count || 0;
      const that = this;
      return new Promise((resolve) => {
        that.resolveCallbacks[id] = resolve;
        that.postMessage('renderPlantuml', [{ id, name, code, count, sourceUri: that.sourceUri }]);
      });
    }

    fetch() {
      const that = this;
      return function (input, init) {
        const checksum = hashString(input + (!!init.data ? init.data : ''));
        const id = `cb-${checksum}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        return new Promise((resolve, reject) => {
          that.resolveCallbacks[id] = { resolve, reject };
          that.postMessage('fetch', [id, input, init]);
        });
      };
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
      if (this.config.vscode) {
        window.fetch = this.fetch();
      }
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

      const that = this;
      previewer
        .makeHtml(markdown)
        .then((res) => {
          if (typeof res === 'object') {
            that.previewElement.innerHTML = that.changeVscodeResourceProtocol(res.html);
            that.scripts = [...res.scripts];
            that.cssLinks = [...res.cssLinks];
            previewer.completedHtml(res.scripts, '.showdowns');
            that.scripts.forEach((script) => {
              if (script.code && typeof script.code === 'function') {
                script.code = `(${script.code.toString()})();`;
              }
              if (script.inner && Array.isArray(script.inner)) {
                script.inner.forEach((s) => {
                  if (s.code && typeof s.code === 'function') {
                    s.code = `(${s.code.toString()})();`;
                  }
                });
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
          case 'responsePlantuml':
            if (this.resolveCallbacks.hasOwnProperty(message.id)) {
              const callback = this.resolveCallbacks[message.id];
              delete this.resolveCallbacks[message.id];
              if (callback) {
                callback(message.response);
              }
            }
            break;
          case 'onfetch':
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
