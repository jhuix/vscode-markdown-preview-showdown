"use strict";
(() => {
  // src/media/webview.js
  (function(previewer, options) {
    function hashString(str) {
      const seed = 31;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = Math.imul(seed, hash) + char | 0;
      }
      return hash >>> 0;
    }
    function deepMerge(target, source) {
      let output = Object.assign({}, target);
      if (typeof source !== "object" || !source) {
        return output;
      }
      Object.keys(source).forEach((key) => {
        if (source[key] && typeof source[key] === "object") {
          if (!output[key] || typeof output[key] !== "object") {
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
        cdnName: "local",
        defScheme: "",
        distScheme: "../node_modules/@jhuix/showdowns/dist/",
        uriPath: "",
        flavor: "",
        markdown: {},
        plantuml: {
          renderMode: "local",
          umlWebSite: "www.plantuml.com/plantuml"
        },
        mermaid: {},
        katex: {},
        kroki: {
          serverUrl: "kroki.io"
        },
        toc: {},
        vega: {}
      };
      return opts ? deepMerge(defOptions, opts) : defOptions;
    }
    options = initOptions(options);
    class ContextMenu {
      constructor(selector, menuItems) {
        const menus = document.createElement("ul");
        menus.classList.add("context-menu-list");
        menus.style.top = "-50%";
        menus.style.display = "none";
        menus.style.zIndex = "1";
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
        this.selector.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          that.show(event.clientX, event.clientY);
        });
        document.addEventListener("click", function(e) {
          that.hide();
        });
      }
      initMenuItem(menuItems) {
        if (typeof menuItems !== "object" || !menuItems) return;
        if (menuItems.hasOwnProperty("style")) {
          for (const key in menuItems["style"]) {
            this.menus.style[key] = menuItems["style"][key];
          }
        }
        if (menuItems.hasOwnProperty("items")) {
          const that = this;
          const items = menuItems.items;
          for (const index in items) {
            const item = items[index];
            const menu = document.createElement("li");
            menu.classList.add("context-menu-item");
            switch (item.type) {
              case "menu":
                menu.appendChild(document.createElement("span")).appendChild(document.createTextNode(item.title));
                if (item.hasOwnProperty("onclick") && typeof item.onclick === "function") {
                  menu.addEventListener("click", (event) => {
                    item.onclick(event, that.selector);
                    that.hide();
                  });
                }
                this.menus.appendChild(menu);
                break;
              case "submenu":
                menu.classList.add("context-menu-submenu");
                menu.appendChild(document.createElement("span")).appendChild(document.createTextNode(item.title));
                this.menus.appendChild(menu);
                break;
              case "separator":
                menu.classList.add("context-menu-separator");
                this.menus.appendChild(menu);
                break;
            }
          }
        }
      }
      show(x, y) {
        this.menus.style.display = "block";
        if (y + this.menus.clientHeight > window.innerHeight - 10) {
          y -= this.menus.clientHeight + 10;
        }
        if (x + this.menus.clientWidth > window.innerWidth - 10) {
          x -= this.menus.clientWidth + 10;
        }
        x += window.pageXOffset;
        y += window.pageYOffset;
        this.menus.style.left = x + "px";
        this.menus.style.top = y + "px";
      }
      hide() {
        this.menus.style.display = "none";
        this.menus.style.top = "-50%";
      }
    }
    var localizedMenu = {
      en: {
        "menu.browsehtml": "Browse HTML Page",
        "menu.exporthtml": "Export \u279D HTML",
        "menu.exportpdf": "Export \u279D PDF",
        "menu.exportwebp": "Export \u279D WEBP",
        "menu.exportpng": "Export \u279D PNG",
        "menu.exportjpg": "Export \u279D JPG"
      },
      "zh-cn": {
        "menu.browsehtml": "\u7528\u6D4F\u89C8\u5668\u6253\u5F00",
        "menu.exporthtml": "\u5BFC\u51FA\u6587\u4EF6 \u279D HTML",
        "menu.exportpdf": "\u5BFC\u51FA\u6587\u4EF6 \u279D PDF",
        "menu.exportwebp": "\u5BFC\u51FA\u6587\u4EF6 \u279D WEBP",
        "menu.exportpng": "\u5BFC\u51FA\u56FE\u7247 \u279D PNG",
        "menu.exportjpg": "\u5BFC\u51FA\u56FE\u7247 \u279D JPG"
      }
    };
    function localize(key) {
      let locale = document.children[0].lang;
      if (!locale) {
        locale = "en";
      }
      return localizedMenu[locale][key] ? localizedMenu[locale][key] : "";
    }
    class PreviewHtml {
      //This PreviewHtml should be initialized when the html dom is loaded.
      constructor(isVscode) {
        this.vscodeAPI = null;
        this.sourceUri = "";
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
            vega: options.vega
          }
        };
        const previewElement = document.createElement("div");
        previewElement.classList.add("workspace-container", "main-toc-row");
        this.previewElement = previewElement;
        document.body.appendChild(this.previewElement);
        this.initWindowEvents();
        this.initMenus();
        let currPath = "";
        if (options.uriPath) {
          currPath = "file:///" + options.uriPath;
          if (this.config.vscode) {
            const url = new URL(options.defScheme);
            currPath = url.origin + "/" + options.uriPath;
          }
        }
        previewer.setCDN(options.cdnName, options.defScheme, options.distScheme, currPath);
        previewer.init(true);
        this.updateOptions(this.config.options);
        if (!this.config.vscode) {
          window.dispatchEvent(
            new CustomEvent("showdownsLoaded", {
              detail: {
                phtml: this
              }
            })
          );
        } else {
          this.postMessage("webviewLoaded", [document.title]);
        }
      }
      updateOptions(options2) {
        if (options2.flavor) {
          previewer.setShowdownFlavor(options2.flavor);
        }
        if (options2.markdown) {
          previewer.setShowdownOptions(options2.markdown);
        }
        if (options2.vega) {
          previewer.setVegaOptions(Object.assign({ renderer: "svg" }, options2.vega));
        }
        if (options2.mermaid) {
          previewer.setMermaidOptions(options2.mermaid);
        }
        if (options2.plantuml) {
          if (options2.plantuml.renderMode === "local") {
            previewer.setPlantumlOptions({ imageFormat: "svg", svgRender: this.renderPlantuml.bind(this) });
          } else {
            previewer.setPlantumlOptions({ imageFormat: "svg", umlWebSite: options2.plantuml.umlWebSite });
          }
        }
        if (options2.katex) {
          previewer.setKatexOptions(options2.katex);
        }
        if (options2.kroki) {
          previewer.setKrokiOptions(options2.kroki);
        }
        if (options2.toc) {
          previewer.setExtensionOptions("toc", options2.toc);
        }
      }
      getOtherStyles() {
        let styles = [];
        const elVegaEmbedStyle = document.getElementById("vega-embed-style");
        if (elVegaEmbedStyle && elVegaEmbedStyle.tagName.toLowerCase() === "style") {
          let styleContent = elVegaEmbedStyle.innerHTML;
          styleContent = styleContent.replace(/\<br[\/]?\>/g, "");
          styles.push({
            id: "vega-embed-style",
            style: styleContent
          });
        }
        const abcAudioStyle = document.getElementById("css-abc-audio");
        if (abcAudioStyle && abcAudioStyle.tagName.toLowerCase() === "style") {
          let styleContent = abcAudioStyle.innerHTML;
          styleContent = styleContent.replace(/\<br[\/]?\>/g, "");
          styles.push({
            id: "css-abc-audio",
            style: styleContent
          });
        }
        return styles;
      }
      initMenus() {
        const that = this;
        const menuItems = {
          style: {
            zIndex: "1",
            display: "none"
          },
          items: [
            {
              type: "menu",
              title: localize("menu.browsehtml"),
              onclick: function(e, s) {
                that.postMessage("openInBrowser", [
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
              type: "menu",
              title: localize("menu.exporthtml"),
              onclick: function(e, s) {
                that.postMessage("exportHTML", [
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
              type: "menu",
              title: localize("menu.exportpdf"),
              onclick: function(e, s) {
                that.postMessage("exportPDF", [
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
              type: "menu",
              title: localize("menu.exportwebp"),
              onclick: function(e, s) {
                that.postMessage("exportWEBP", [
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
              type: "menu",
              title: localize("menu.exportpng"),
              onclick: function(e, s) {
                that.postMessage("exportPNG", [
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
              type: "menu",
              title: localize("menu.exportjpg"),
              onclick: function(e, s) {
                that.postMessage("exportJPEG", [
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
          html = html.replace(new RegExp(`(<img.* src=")(.*?vscode-webview.*?)"`, `g`), function(match, tag, url) {
            let imgUrl = new URL(decodeURIComponent(url));
            imgUrl.protocol = "file:";
            imgUrl.host = "";
            url = imgUrl.toString();
            return tag + url + '"';
          });
          html = html.replace(
            new RegExp(`"([^"]*?file.*?.vscode-resource.vscode-cdn.net/)(.*?)"`, `g`),
            function(match, tag, url) {
              let imgUrl = new URL(decodeURIComponent(url));
              imgUrl.protocol = "file:";
              imgUrl.host = "";
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
          const vscodeResourceScheme = resUrl.origin + "/";
          html = html.replace(/(\<img.* src=")file:\/\/\//g, "$1" + vscodeResourceScheme);
          html = html.replace(/(\<img.* src=")\.\//g, "$1" + vscodeResourceScheme + options.uriPath + "/");
        }
        return html.trim();
      }
      // Post message to parent window
      postMessage(command, args = []) {
        if (this.config.vscode) {
          if (!this.vscodeAPI) {
            this.vscodeAPI = acquireVsCodeApi();
          }
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
              "file://"
            );
          }
        }
      }
      renderPlantuml(id, name, code, count) {
        count = count || 0;
        const that = this;
        return new Promise((resolve) => {
          that.resolveCallbacks[id] = resolve;
          that.postMessage("renderPlantuml", [{ id, name, code, count, sourceUri: that.sourceUri }]);
        });
      }
      fetch() {
        const that = this;
        return function(input, init) {
          const checksum = hashString(input + (!!init.data ? init.data : ""));
          const id = `cb-${checksum}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
          return new Promise((resolve, reject) => {
            that.resolveCallbacks[id] = { resolve, reject };
            that.postMessage("fetch", [id, input, init]);
          });
        };
      }
      // Initialize `window` events.
      initWindowEvents() {
        window.addEventListener("keydown", (event) => {
          if (event.shiftKey && event.ctrlKey && event.which === 83) {
            return this.previewSyncSource();
          }
        });
        window.addEventListener("scroll", (event) => {
          this.scrollEvent(event);
        });
        window.addEventListener("message", (event) => {
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
          markdown = "[TOC]\n\n" + markdown;
        }
        const that = this;
        previewer.makeHtml(markdown).then((res) => {
          if (typeof res === "object") {
            that.previewElement.innerHTML = that.changeVscodeResourceProtocol(res.html);
            that.scripts = [];
            that.cssLinks = [...res.cssLinks];
            previewer.completedHtml(res.scripts, ".showdowns");
            res.scripts.forEach((script) => {
              const s = {};
              if (!script.once) {
                if (script.id) {
                  s.id = script.id;
                }
                if (script.host) {
                  s.host = script.host;
                }
                if (script.code) {
                  if (typeof script.code === "function") {
                    s.code = `(${script.code.toString()})();`;
                  } else {
                    s.code = script.code;
                  }
                }
              }
              if (script.inner && Array.isArray(script.inner)) {
                s.inner = [];
                script.inner.forEach((inner) => {
                  if (!inner.once) {
                    const ins = {};
                    if (inner.id) {
                      ins.id = inner.id;
                    }
                    if (inner.host) {
                      ins.host = inner.host;
                    }
                    if (inner.code) {
                      if (typeof inner.code === "function") {
                        ins.code = `(${inner.code.toString()})();`;
                      } else {
                        ins.code = inner.code;
                      }
                    }
                    s.inner.push[ins];
                  }
                });
              }
              if (script.outer && Array.isArray(script.outer)) {
                s.outer = [];
                script.inner.forEach((outer) => {
                  if (!outer.once) {
                    s.outer.push(outer);
                  }
                });
              }
              that.scripts.push(s);
            });
          } else {
            that.scripts = [];
            that.cssLinks = [];
            that.previewElement.innerHTML = that.changeVscodeResourceProtocol(res);
          }
        }).catch((err) => {
          that.scripts = [];
          that.cssLinks = [];
          that.previewElement.innerHTML = "";
          console.log(err);
        });
      }
      messageEvent(event) {
        const message = event.data;
        if (message) {
          switch (message.command) {
            case "updateMarkdown":
              this.sourceUri = message.uri;
              this.updateMarkdown(message.markdown, message.options);
              if (message.title) {
                document.title = message.title;
              }
              this.totalLines = message.totalLines;
              this.scrollToLine(message.currentLine);
              break;
            case "changeVisibleRanges":
              const line = parseInt(message.line, 10);
              this.scrollToLine(line);
              break;
            case "responsePlantuml":
              if (this.resolveCallbacks.hasOwnProperty(message.id)) {
                const callback = this.resolveCallbacks[message.id];
                delete this.resolveCallbacks[message.id];
                if (callback) {
                  callback(message.response);
                }
              }
              break;
            case "onfetch":
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
            scrollLine = parseInt(top * this.totalLines / this.previewElement.scrollHeight, 10);
          }
        }
        this.postMessage("revealLine", [this.sourceUri, scrollLine]);
      }
      scrollToLine(line) {
        if (line !== this.currentLine) {
          if (this.totalLines) {
            this.currentLine = line;
            let scrollTop = 0;
            if (line + 1 === this.totalLines) {
              scrollTop = this.previewElement.scrollHeight;
            } else {
              scrollTop = parseInt(line * this.previewElement.scrollHeight / this.totalLines, 10);
            }
            if (window.scrollY !== scrollTop) {
              this.syncScrollTop = window.scrollY;
              window.scroll({
                left: 0,
                top: scrollTop,
                behavior: "smooth"
              });
            }
          }
        }
      }
    }
    function onLoad() {
      window.mdsp.phtml = new PreviewHtml(options.vscode);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onLoad);
    } else {
      onLoad();
    }
  })(window.showdowns, window.mdsp && window.mdsp.options ? window.mdsp.options : {});
})();
//# sourceMappingURL=webview.js.map
