import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// 注册 CodeLens provider
	const codeLensProvider = new JavaImplementationCodeLensProvider();
	// 在 activate 函数中添加命令注册
	context.subscriptions.push(
		vscode.commands.registerCommand('java.implementation.goto', async (uri: vscode.Uri, position: vscode.Position) => {
			try {
				// 使用 LSP 查找实现
				const implementations = await vscode.commands.executeCommand<vscode.Location[]>(
					'vscode.executeImplementationProvider',
					uri,
					position
				);

				if (!implementations || implementations.length === 0) {
					vscode.window.showInformationMessage('没有找到实现类');
					return;
				}

				// 如果只有一个实现，直接跳转
				if (implementations.length === 1) {
					const implementation = implementations[0];
					const doc = await vscode.workspace.openTextDocument(implementation.uri);
					await vscode.window.showTextDocument(doc);
					vscode.window.activeTextEditor?.revealRange(implementation.range);
				} else {
					// 如果有多个实现，显示选择列表
					const items = await Promise.all(
						implementations.map(async impl => {
							const doc = await vscode.workspace.openTextDocument(impl.uri);
							return {
								label: `${doc.fileName}`,
								implementation: impl
							};
						})
					);

					const selected = await vscode.window.showQuickPick(items, {
						placeHolder: '选择要跳转的实现类'
					});

					if (selected) {
						const doc = await vscode.workspace.openTextDocument(selected.implementation.uri);
						await vscode.window.showTextDocument(doc);
						vscode.window.activeTextEditor?.revealRange(selected.implementation.range);
					}
				}
			} catch (error) {
				vscode.window.showErrorMessage(`跳转失败: ${error}`);
			}
		})
	);
}

class JavaImplementationCodeLensProvider implements vscode.CodeLensProvider {
	async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];

		// 获取文档中的所有符号
		const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
			'vscode.executeDocumentSymbolProvider',
			document.uri
		);

		if (!symbols) {
			return [];
		}

		for (const symbol of symbols) {
			if (symbol.kind === vscode.SymbolKind.Interface ||
				symbol.kind === vscode.SymbolKind.Method) {

				const range = symbol.location.range;
				const command: vscode.Command = {
					title: '➜ 跳转到实现',
					command: 'java.implementation.goto',
					arguments: [document.uri, range.start]
				};

				codeLenses.push(new vscode.CodeLens(range, command));
			}
		}

		return codeLenses;
	}
}