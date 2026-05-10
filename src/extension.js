const vscode = require('vscode');
const { DevBoardPanel } = require('./devboardPanel');

function activate(context) {
  const provider = new DevBoardPanel(context);

  vscode.window.registerWebviewViewProvider('devboard.panel', provider, {
    webviewOptions: { retainContextWhenHidden: true }
  });

  // Refresh command (button in panel title)
  vscode.commands.registerCommand('devboard.refresh', () => {
    provider.refresh();
  });

  // Auto-refresh TODOs on save
  vscode.workspace.onDidSaveTextDocument(() => provider.refresh());
}

function deactivate() {}

module.exports = { activate, deactivate };
