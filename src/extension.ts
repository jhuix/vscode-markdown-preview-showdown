/*
 * @Description:
 * @Author: Jhuix (Hui Jin) <jhuix0117@gmail.com>
 * @Date: 2019-10-26 12:12:22
 * @LastEditors: Jhuix (Hui Jin) <jhuix0117@gmail.com>
 * @LastEditTime: 2019-10-26 13:18:15
 */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ShowdownPreviewer } from './previewer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
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
    if (!contentPreviewer.isAutoPreview() || contentPreviewer.isFirstPreview()) {
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (ShowdownPreviewer.isMarkdownFile(editor.document)) {
        openPreview(editor.document.uri);
      }
    }
  }

  if (vscode.window.activeTextEditor) {
    previewFirstPreview();
  } else {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (ShowdownPreviewer.isMarkdownFile(document) && contentPreviewer.isAutoPreview()) {
          openPreview(document.uri);
        }
      })
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const result = vscode.workspace.getConfiguration().get('files.autoSave');
      if (result !== 'off' && ShowdownPreviewer.isMarkdownFile(document)) {
        contentPreviewer.updatePreview(document.uri);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const result = vscode.workspace.getConfiguration().get('files.autoSave');
      if (result === 'off' && ShowdownPreviewer.isMarkdownFile(event.document)) {
        contentPreviewer.update(event.document.uri);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      console.log('onDidChangeConfiguration');
      contentPreviewer.updateConfiguration();
    })
  );

  // context.subscriptions.push(
  //   vscode.window.onDidChangeTextEditorSelection((event) => {
  //      if (ShowdownPreviewer.isMarkdownFile(event.textEditor.document)) {
  //       contentPreviewer.changeTextEditorSelection(event.textEditor);
  //      }
  //   })
  // );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      if (ShowdownPreviewer.isMarkdownFile(event.textEditor.document)) {
        contentPreviewer.changeTextEditorSelection(event.textEditor);
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((textEditor) => {
      if (textEditor && !contentPreviewer.changeActiveTextEditor(textEditor)) {
        previewFirstPreview();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${ShowdownPreviewer.getPackageName()}.openPreview`, openPreview)
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log('deactivate');
}
