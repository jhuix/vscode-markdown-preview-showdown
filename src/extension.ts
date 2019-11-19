/*
 * @Description:
 * @Author: Jhuix (Hui Jin) <jhuix0117@gmail.com>
 * @Date: 2019-10-26 12:12:22
 * @LastEditors: Jhuix (Hui Jin) <jhuix0117@gmail.com>
 * @LastEditTime: 2019-10-26 13:18:15
 */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ShowdownPreviewer } from "./previewer";

let editorScrollDelay = Date.now();
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // let close_other_editor_command_id =
  //  "workbench.action.closeEditorsInOtherGroups";
  // assume only one preview supported.
  const contentPreviewer = new ShowdownPreviewer(context);

  function openPreview(uri?: vscode.Uri) {
    if (!vscode.window.activeTextEditor) {
      return;
    }
    if (!(uri instanceof vscode.Uri)) {
      // we are relaxed and don't check for markdown files
      uri = vscode.window.activeTextEditor.document.uri;
    }
    contentPreviewer.openPreview(uri, vscode.window.activeTextEditor, {
      preserveFocus: true,
      viewColumn: vscode.ViewColumn.Two
    });
  }

  function previewFirstPreview() {
    if (contentPreviewer.isFirstPreview()) {
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (ShowdownPreviewer.isMarkdownFile(editor.document)) {
        openMarkdownPreview();
      }
    }
  }

  async function openMarkdownPreview() {
    openPreview();
    // vscode.commands
    //   .executeCommand(close_other_editor_command_id)
    //   .then(() => openPreview());
  }

  if (vscode.window.activeTextEditor) {
    previewFirstPreview();
  } else {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(document => {
        if (ShowdownPreviewer.isMarkdownFile(document)) {
          openPreview(document.uri);
        }
      })
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      if (ShowdownPreviewer.isMarkdownFile(document)) {
        contentPreviewer.updatePreview(document.uri);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (ShowdownPreviewer.isMarkdownFile(event.document)) {
        contentPreviewer.update(event.document.uri);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      contentPreviewer.updateConfiguration();
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(event => {
      if (ShowdownPreviewer.isMarkdownFile(event.textEditor.document)) {
        const topLine = getTopVisibleLine(event.textEditor);
        const bottomLine = getBottomVisibleLine(event.textEditor);
        let midLine;
        if (topLine === 0) {
          midLine = 0;
        } else if (Math.floor(bottomLine) === event.textEditor.document.lineCount - 1) {
          midLine = bottomLine;
        } else {
          midLine = Math.floor((topLine + bottomLine) / 2);
        }
        const topRatio = (midLine - topLine) / (bottomLine - topLine);
        contentPreviewer.previewPostMessage({
          command: "changeTextEditorSelection",
          line: midLine,
          topRatio
        });
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
      const textEditor = event.textEditor;
      if (Date.now() < editorScrollDelay) {
        return;
      }
      if (ShowdownPreviewer.isMarkdownFile(textEditor.document)) {
        // const sourceUri = textEditor.document.uri;
        if (!event.textEditor.visibleRanges.length) {
          return undefined;
        } else {
          const topLine = getTopVisibleLine(textEditor);
          const bottomLine = getBottomVisibleLine(textEditor);
          let midLine;
          if (topLine === 0) {
            midLine = 0;
          } else if (Math.floor(bottomLine) === textEditor.document.lineCount - 1) {
            midLine = bottomLine;
          } else {
            midLine = Math.floor((topLine + bottomLine) / 2);
          }
          contentPreviewer.previewPostMessage({
            command: "changeTextEditorSelection",
            line: midLine
          });
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(textEditor => {
      if (textEditor && textEditor.document && textEditor.document.uri) {
        if (ShowdownPreviewer.isMarkdownFile(textEditor.document)) {
          const sourceUri = textEditor.document.uri;
          // const config = vscode.workspace.getConfiguration(
          //   ShowdownPreviewer.getPreviewType()
          // );
          /**
           * Is using single preview and the preview is on.
           * When we switched text ed()tor, update preview to that text editor.
           */
          if (contentPreviewer.isPreviewOn()) {
            if (!contentPreviewer.isSameUri(sourceUri)) {
              const previewPanel = contentPreviewer.getPreview();
              const viewColumn =
                previewPanel && previewPanel.viewColumn ? previewPanel.viewColumn : vscode.ViewColumn.Two;
              contentPreviewer.openPreview(sourceUri, textEditor, {
                preserveFocus: true,
                viewColumn
              });
            } else {
              const previewPanel = contentPreviewer.getPreview();
              if (previewPanel) {
                previewPanel.reveal(vscode.ViewColumn.Two, true);
              }
            }
          } else {
            previewFirstPreview();
          }
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${ShowdownPreviewer.getPackageName()}.openPreview`, openPreview)
  );
}

function revealLine(uri: string, line: number) {
  const sourceUri = vscode.Uri.parse(uri);
  vscode.window.visibleTextEditors
    .filter(
      editor => ShowdownPreviewer.isMarkdownFile(editor.document) && editor.document.uri.fsPath === sourceUri.fsPath
    )
    .forEach(editor => {
      const sourceLine = Math.min(Math.floor(line), editor.document.lineCount - 1);
      const fraction = line - sourceLine;
      const text = editor.document.lineAt(sourceLine).text;
      const start = Math.floor(fraction * text.length);
      editorScrollDelay = Date.now() + 100 * 5;
      editor.revealRange(new vscode.Range(sourceLine, start, sourceLine + 1, 0), vscode.TextEditorRevealType.InCenter);
      editorScrollDelay = Date.now() + 100 * 5;
    });
}
/**
 * Get the top-most visible range of `editor`.
 *
 * Returns a fractional line number based the visible character within the line.
 * Floor to get real line number
 */
function getTopVisibleLine(editor: vscode.TextEditor) {
  if (!editor.visibleRanges.length) {
    return 0;
  }
  const startPosition = editor.visibleRanges[0].start;
  return startPosition.line;
  // const lineNumber = firstVisiblePosition.line;
  // const line = editor.document.lineAt(lineNumber);
  // const progress = firstVisiblePosition.character / (line.text.length + 2);
  // return lineNumber + progress;
}

/**
 * Get the bottom-most visible range of `editor`.
 *
 * Returns a fractional line number based the visible character within the line.
 * Floor to get real line number
 */
function getBottomVisibleLine(editor: vscode.TextEditor) {
  if (!editor.visibleRanges.length) {
    return 0;
  }
  const endPosition = editor.visibleRanges[0].end;
  return endPosition.line;
  // const lineNumber = firstVisiblePosition.line;
  // let text = "";
  // if (lineNumber < editor.document.lineCount) {
  //   text = editor.document.lineAt(lineNumber).text;
  // }
  // const progress = firstVisiblePosition.character / (text.length + 2);
  // return lineNumber + progress;
}

// this method is called when your extension is deactivated
export function deactivate() {}
