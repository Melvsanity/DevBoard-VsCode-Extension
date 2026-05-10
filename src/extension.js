const vscode = require('vscode');
const { TodoNexusPanel } = require('./TodonexusPanel');

function activate(context) {
  const provider = new TodoNexusPanel(context);

  vscode.window.registerWebviewViewProvider('todonexus.panel', provider, {
    webviewOptions: { retainContextWhenHidden: true }
  });

  vscode.commands.registerCommand('todonexus.refresh', () => {
    provider.refresh();
  });

  vscode.workspace.onDidSaveTextDocument(() => provider.refresh());
}

function deactivate() {}

module.exports = { activate, deactivate };