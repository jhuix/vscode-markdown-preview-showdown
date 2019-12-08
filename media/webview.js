/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
(function(previewer, cdnName, defScheme, distScheme, isBrotli, maxContentSize, mermaidTheme, vegaTheme) {
  class ContextMenu {
    constructor(selector, menuItems) {
      const menus = document.createElement('ul');
      menus.classList.add('context-menu-list');
      menus.style.top = '-50%';
      menus.style.display = 'none';
      menus.style.zIndex = '1';
      this.menus = menus;
      this.selector = selector ? selector : document;
      this.csstypes = {};
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
      document.addEventListener('click', function(e) {
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
      'menu.exporthtml': 'Export -> HTML',
      'menu.exportpdf': 'Export -> PDF',
      'menu.exportpng': 'Export -> PNG',
      'menu.exportjpg': 'Export -> JPG'
    },
    'zh-cn': {
      'menu.browsehtml': '用浏览器打开',
      'menu.exporthtml': '导出文件 -> HTML',
      'menu.exportpdf': '导出文件 -> PDF',
      'menu.exportpng': '导出图片 -> PNG',
      'menu.exportjpg': '导出图片 -> JPG'
    }
  };

  function localize(key) {
    var locale = 'en';
    var langMeta = document.querySelector('meta[http-equiv="Content-Language"]');
    if (langMeta) {
      var lang = langMeta.getAttribute('content');
      if (lang) {
        locale = lang.toLowerCase();
        if (!localizedMenu.hasOwnProperty(locale) || !localizedMenu[locale]) {
          locale = 'en';
        }
      }
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
      this.config = { vscode: isVscode };
      const previewElement = document.createElement('div');
      previewElement.classList.add('workspace-container');
      this.previewElement = previewElement;
      document.body.appendChild(this.previewElement);
      this.initWindowEvents();
      this.initMenus();
      previewer.setCDN(cdnName, defScheme, distScheme);
      previewer.setVegaOptions({ theme: vegaTheme, renderer: 'svg' });
      previewer.setMermaidOptions({ theme: mermaidTheme });
      previewer.init(true);
      if (!isBrotli) {
        this.postMessage('webviewLoaded', [document.title]);
      }
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
            onclick: function(e, s) {
              let styles = [];
              const elVegaEmbedStyle = document.getElementById('vega-embed-style');
              if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
                let styleHTML = elVegaEmbedStyle.outerHTML;
                styleHTML = styleHTML.replace(/\<br[\/]?\>/g, '');
                styles.push(styleHTML);
              }
              that.postMessage('openInBrowser', [
                s.innerHTML.length > maxContentSize
                  ? { type: 'br', content: previewer.brEncode(s.innerHTML.trim()) }
                  : s.innerHTML.trim(),
                document.title,
                that.sourceUri,
                that.csstypes,
                styles
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exporthtml'),
            onclick: function(e, s) {
              let styles = [];
              const elVegaEmbedStyle = document.getElementById('vega-embed-style');
              if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
                let styleHTML = elVegaEmbedStyle.outerHTML;
                styleHTML = styleHTML.replace(/\<br[\/]?\>/g, '');
                styles.push(styleHTML);
              }
              that.postMessage('exportHTML', [
                s.innerHTML.length > maxContentSize
                  ? { type: 'br', content: previewer.brEncode(s.innerHTML.trim()) }
                  : s.innerHTML.trim(),
                document.title,
                that.sourceUri,
                that.csstypes,
                styles
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportpdf'),
            onclick: function(e, s) {
              let styles = [];
              const elVegaEmbedStyle = document.getElementById('vega-embed-style');
              if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
                let styleHTML = elVegaEmbedStyle.outerHTML;
                styleHTML = styleHTML.replace(/\<br[\/]?\>/g, '');
                styles.push(styleHTML);
              }
              that.postMessage('exportPDF', [
                s.innerHTML.length > maxContentSize
                  ? { type: 'br', content: previewer.brEncode(s.innerHTML.trim()) }
                  : s.innerHTML.trim(),
                document.title,
                that.sourceUri,
                that.csstypes,
                styles
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportpng'),
            onclick: function(e, s) {
              let styles = [];
              const elVegaEmbedStyle = document.getElementById('vega-embed-style');
              if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
                let styleHTML = elVegaEmbedStyle.outerHTML;
                styleHTML = styleHTML.replace(/\<br[\/]?\>/g, '');
                styles.push(styleHTML);
              }
              that.postMessage('exportPNG', [
                s.innerHTML.length > maxContentSize
                  ? { type: 'br', content: previewer.brEncode(s.innerHTML.trim()) }
                  : s.innerHTML.trim(),
                document.title,
                that.sourceUri,
                that.csstypes,
                styles
              ]);
            }
          },
          {
            type: 'menu',
            title: localize('menu.exportjpg'),
            onclick: function(e, s) {
              let styles = [];
              const elVegaEmbedStyle = document.getElementById('vega-embed-style');
              if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === 'style') {
                let styleHTML = elVegaEmbedStyle.outerHTML;
                styleHTML = styleHTML.replace(/\<br[\/]?\>/g, '');
                styles.push(styleHTML);
              }
              that.postMessage('exportJPEG', [
                s.innerHTML.length > maxContentSize
                  ? { type: 'br', content: previewer.brEncode(s.innerHTML.trim()) }
                  : s.innerHTML.trim(),
                document.title,
                that.sourceUri,
                that.csstypes,
                styles
              ]);
            }
          }
        ]
      };

      this.contextMenu = new ContextMenu(this.previewElement, menuItems);
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
        if (window.parent != window) {
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
      window.addEventListener('showdownsLoaded', (event) => {
        if (event.detail.name === 'wasm_brotli_browser_bg.wasm') {
          this.postMessage('webviewLoaded', [document.title]);
        }
      });
    }

    updateMarkdown(markdown) {
      const that = this;
      this.previewElement.innerHTML = previewer.makeHtml(markdown, (csstypes) => {
        that.csstypes = csstypes;
      });
    }

    messageEvent(event) {
      const message = event.data;
      if (message) {
        switch (message.command) {
          case 'updateMarkdown':
            this.sourceUri = message.uri;
            this.updateMarkdown(message.markdown);
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
    if (typeof window.mdsp === 'object' && window.mdsp) {
      window.mdsp.phtml = new PreviewHtml(false);
    } else {
      new PreviewHtml(true);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onLoad);
  } else {
    onLoad();
  }
})(
  showdowns,
  typeof cdn_name === 'undefined' ? 'local' : cdn_name,
  typeof scheme_default === 'undefined' ? '' : scheme_default,
  typeof scheme_dist === 'undefined' ? '' : scheme_dist,
  typeof is_brotli === 'undefined' ? true : is_brotli,
  typeof max_contentsize === 'undefined' ? 32768 : max_contentsize,
  typeof mermaid_theme === 'undefined' ? 'default' : mermaid_theme,
  typeof vega_theme === 'undefined' ? 'vox' : vega_theme
);
