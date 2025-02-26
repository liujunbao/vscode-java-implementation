import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const codeLensProvider = new JavaImplementationCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'java', scheme: 'file' },
            codeLensProvider
        )
    );
    // 修改命令处理函数
    context.subscriptions.push(
        vscode.commands.registerCommand('java.implementation.goto', async (uri: vscode.Uri, position: vscode.Position) => {
            // 直接调用 VS Code 内置的跳转实现命令
            await vscode.commands.executeCommand('editor.action.goToImplementation');
        })
    );
}

class JavaImplementationCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) {
            return [];
        }

        for (const symbol of symbols) {
            // 对接口和方法分别处理
            if (symbol.kind === vscode.SymbolKind.Interface) {
                const range = new vscode.Range(
                    new vscode.Position(symbol.location.range.start.line, 0),
                    new vscode.Position(symbol.location.range.start.line, 1)
                );
                
                const command: vscode.Command = {
                    title: '⮞',
                    command: 'java.implementation.goto',
                    arguments: [document.uri, symbol.location.range.start]
                };

                codeLenses.push(new vscode.CodeLens(range, command));
            }
            else if (symbol.kind === vscode.SymbolKind.Method) {
                // 为方法创建单独的 range
                const methodRange = new vscode.Range(
                    new vscode.Position(symbol.location.range.start.line, 0),
                    new vscode.Position(symbol.location.range.start.line, 1)
                );
                
                const methodCommand: vscode.Command = {
                    title: '⮞',
                    command: 'java.implementation.goto',
                    arguments: [document.uri, symbol.location.range.start]
                };

                codeLenses.push(new vscode.CodeLens(methodRange, methodCommand));
            }
        }

        return codeLenses;
    }
}