import * as vscode from 'vscode';
import { TranslationService } from './services/translationService';
import { MarkdownProcessor } from './processors/markdownProcessor';
import { ConfigManager } from './config/configManager';
import { SettingsPanel } from './webview/settingsPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Translate Wiki插件已激活');

    // 显示激活消息
    vscode.window.showInformationMessage('AI翻译插件已激活！');

    const configManager = new ConfigManager();
    const translationService = new TranslationService(configManager);
    const markdownProcessor = new MarkdownProcessor(translationService, configManager);

    // 注册命令
    console.log('开始注册命令...');

    const translateFileCommand = vscode.commands.registerCommand('ai-translate-wiki.translateFile', async () => {
        console.log('翻译文件命令被调用');
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('请先打开一个Markdown文件');
            return;
        }

        const document = activeEditor.document;
        if (document.languageId !== 'markdown') {
            vscode.window.showWarningMessage('请选择一个Markdown文件');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在翻译文件...",
                cancellable: true
            }, async (progress, token) => {
                await markdownProcessor.translateFile(document, progress, token);
            });

            vscode.window.showInformationMessage('文件翻译完成！');
        } catch (error) {
            vscode.window.showErrorMessage(`翻译失败: ${error}`);
        }
    });

    const translateSelectionCommand = vscode.commands.registerCommand('ai-translate-wiki.translateSelection', async () => {
        console.log('翻译选中内容命令被调用');
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }

        const selection = activeEditor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('请先选择要翻译的内容');
            return;
        }

        const selectedText = activeEditor.document.getText(selection);

        try {
            // 显示翻译进度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在翻译选中内容...",
                cancellable: false
            }, async () => {
                const translatedText = await translationService.translateText(selectedText);

                // 在编辑器中替换选中的文本
                await activeEditor.edit(editBuilder => {
                    editBuilder.replace(selection, translatedText);
                });
            });

            vscode.window.showInformationMessage('选中内容翻译完成！');
        } catch (error) {
            console.error('翻译错误:', error);
            vscode.window.showErrorMessage(`翻译失败: ${error}`);
        }
    });

    const openSettingsCommand = vscode.commands.registerCommand('ai-translate-wiki.openSettings', () => {
        console.log('打开设置命令被调用');
        SettingsPanel.createOrShow(context.extensionUri, configManager);
    });

    const translateDirectoryCommand = vscode.commands.registerCommand('ai-translate-wiki.translateDirectory', async () => {
        console.log('批量翻译目录命令被调用');

        try {
            const inputDir = configManager.getInputDirectory();
            const filePattern = configManager.getFilePattern();
            const recursive = configManager.getRecursiveSearch();

            // 使用glob模式查找文件
            const pattern = recursive ? filePattern : filePattern.replace('**/', '');
            const files = await vscode.workspace.findFiles(pattern, null, 100);

            if (files.length === 0) {
                vscode.window.showWarningMessage(`在目录 ${inputDir} 中没有找到匹配 ${filePattern} 的文件`);
                return;
            }

            const result = await vscode.window.showInformationMessage(
                `找到 ${files.length} 个文件，是否开始批量翻译？`,
                '开始翻译',
                '取消'
            );

            if (result !== '开始翻译') {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在批量翻译文件...",
                cancellable: true
            }, async (progress, token) => {
                for (let i = 0; i < files.length; i++) {
                    if (token.isCancellationRequested) {
                        return;
                    }

                    const file = files[i];
                    const document = await vscode.workspace.openTextDocument(file);

                    progress.report({
                        message: `正在翻译 ${file.fsPath} (${i + 1}/${files.length})`,
                        increment: (100 / files.length)
                    });

                    try {
                        await markdownProcessor.translateFile(document, progress, token);
                    } catch (error) {
                        console.error(`翻译文件 ${file.fsPath} 失败:`, error);
                    }
                }
            });

            vscode.window.showInformationMessage(`批量翻译完成！共处理 ${files.length} 个文件`);
        } catch (error) {
            vscode.window.showErrorMessage(`批量翻译失败: ${error}`);
        }
    });

    const testTranslationCommand = vscode.commands.registerCommand('ai-translate-wiki.testTranslation', async () => {
        console.log('测试翻译命令被调用');

        try {
            const testText = "这是一个测试文本，用于验证翻译功能是否正常工作。";
            const apiProvider = configManager.getApiProvider();
            const targetLanguage = configManager.getTargetLanguage();

            vscode.window.showInformationMessage(`开始测试翻译功能...\nAPI: ${apiProvider}\n目标语言: ${targetLanguage}\n原文: ${testText}`);

            const translatedText = await translationService.translateText(testText);

            vscode.window.showInformationMessage(`翻译测试完成！\n原文: ${testText}\n译文: ${translatedText}`);

            // 在调试控制台输出详细信息
            console.log('=== 翻译测试结果 ===');
            console.log('API提供商:', apiProvider);
            console.log('目标语言:', targetLanguage);
            console.log('原文:', testText);
            console.log('译文:', translatedText);
            console.log('==================');

        } catch (error) {
            console.error('翻译测试失败:', error);
            vscode.window.showErrorMessage(`翻译测试失败: ${error}`);
        }
    });

    // 注册状态栏项
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(globe) AI翻译";
    statusBarItem.command = 'ai-translate-wiki.openSettings';
    statusBarItem.show();

    context.subscriptions.push(
        translateFileCommand,
        translateSelectionCommand,
        openSettingsCommand,
        translateDirectoryCommand,
        testTranslationCommand,
        statusBarItem
    );

    console.log('所有命令注册完成');
    vscode.window.showInformationMessage('AI翻译插件命令已注册完成！');
}

export function deactivate() {
    console.log('AI Translate Wiki插件已停用');
}
