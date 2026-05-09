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

  // Pin file from explorer right-click
  vscode.commands.registerCommand('devboard.pinFile', (uri) => {
    const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;
    if (filePath) provider.pinFile(filePath);
  });

  // Auto-refresh TODOs on save
  vscode.workspace.onDidSaveTextDocument(() => provider.refresh());
}

function deactivate() {}

module.exports = { activate, deactivate };
