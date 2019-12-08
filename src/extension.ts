/*
 * Copyright (c) 2019-present, Jhuix (Hui Jin) <jhuix0117@gmail.com>. All rights reserved.
 * Use of this source code is governed by a MIT license that can be found in the LICENSE file.
 */
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

  // When change active texteditor, event order in same viewcolumn:
  // onDidChangeTextEditorVisibleRanges -> onDidChangeVisibleTextEditors -> onDidChangeTextEditorVisibleRanges.
  // And textEditor of first onDidChangeTextEditorVisibleRanges event is previous texteditor,
  // but visibleRanges of event is associated with the active texteditor.
  // So we call updateVisibleRanges that is a debounce method between two onDidChangeTextEditorVisibleRanges event.
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      contentPreviewer.updateVisibleRanges(event.textEditor);
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
export function deactivate() {}
