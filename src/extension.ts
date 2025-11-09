import * as vscode from 'vscode';
import * as path from 'path';
import { TranslationService } from './services/translationService';
import { MarkdownProcessor } from './processors/markdownProcessor';
import { ConfigManager } from './config/configManager';
import { SettingsPanel } from './webview/settingsPanel';
import { TranslateWebviewViewProvider } from './webview/translateWebviewView';
import { I18n } from './utils/i18n';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Translate Wiki插件已激活');

    // 显示激活消息
    vscode.window.showInformationMessage(I18n.t('message.extensionActivated'));

    const configManager = new ConfigManager();
    const translationService = new TranslationService(configManager);
    const markdownProcessor = new MarkdownProcessor(translationService, configManager);

    // 注册命令
    console.log('开始注册命令...');

    const translateFileCommand = vscode.commands.registerCommand('ai-translate-wiki.translateFile', async () => {
        console.log('翻译文件命令被调用');
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage(I18n.t('message.openMarkdownFile'));
            return;
        }

        const document = activeEditor.document;
        if (document.languageId !== 'markdown') {
            vscode.window.showWarningMessage(I18n.t('message.selectMarkdownFile'));
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: I18n.t('message.translatingFile'),
                cancellable: true
            }, async (progress, token) => {
                await markdownProcessor.translateFile(document, progress, token);
            });

            vscode.window.showInformationMessage(I18n.t('message.fileTranslated'));
        } catch (error) {
            vscode.window.showErrorMessage(I18n.t('message.translationFailed', String(error)));
        }
    });

    const translateSelectionCommand = vscode.commands.registerCommand('ai-translate-wiki.translateSelection', async () => {
        console.log('翻译选中内容命令被调用');
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage(I18n.t('message.openFile'));
            return;
        }

        const selection = activeEditor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage(I18n.t('message.selectContent'));
            return;
        }

        const selectedText = activeEditor.document.getText(selection);

        try {
            // 显示翻译进度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: I18n.t('message.translatingFile'),
                cancellable: false
            }, async () => {
                const translatedText = await translationService.translateText(selectedText);

                // 在编辑器中替换选中的文本
                await activeEditor.edit(editBuilder => {
                    editBuilder.replace(selection, translatedText);
                });
            });

            vscode.window.showInformationMessage(I18n.t('message.selectionTranslated'));
        } catch (error) {
            console.error('翻译错误:', error);
            vscode.window.showErrorMessage(I18n.t('message.translationFailed', String(error)));
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
                vscode.window.showWarningMessage(I18n.t('message.noFilesFound', filePattern, inputDir));
                return;
            }

            const result = await vscode.window.showInformationMessage(
                I18n.t('message.filesFound', files.length.toString()),
                I18n.t('message.startTranslation'),
                I18n.t('message.cancel')
            );

            if (result !== I18n.t('message.startTranslation')) {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: I18n.t('message.translatingFile'),
                cancellable: true
            }, async (progress, token) => {
                for (let i = 0; i < files.length; i++) {
                    if (token.isCancellationRequested) {
                        return;
                    }

                    const file = files[i];
                    const document = await vscode.workspace.openTextDocument(file);

                    progress.report({
                        message: I18n.t('webview.progress.translatingFile', path.basename(file.fsPath), (i + 1).toString(), files.length.toString()),
                        increment: (100 / files.length)
                    });

                    try {
                        await markdownProcessor.translateFile(document, progress, token);
                    } catch (error) {
                        console.error(I18n.t('webview.progress.error', file.fsPath), error);
                    }
                }
            });

            vscode.window.showInformationMessage(I18n.t('message.batchTranslationCompleted', files.length.toString()));
        } catch (error) {
            vscode.window.showErrorMessage(I18n.t('message.batchTranslationFailed', String(error)));
        }
    });

    const testTranslationCommand = vscode.commands.registerCommand('ai-translate-wiki.testTranslation', async () => {
        console.log('测试翻译命令被调用');

        try {
            const testText = I18n.t('message.testText', 'This is a test text to verify that the translation function works correctly.');
            const apiProvider = configManager.getApiProvider();
            const targetLanguage = configManager.getTargetLanguage();

            vscode.window.showInformationMessage(I18n.t('message.testTranslationStarted', apiProvider, targetLanguage, testText));

            const translatedText = await translationService.translateText(testText);

            vscode.window.showInformationMessage(I18n.t('message.testTranslationCompleted', testText, translatedText));

            // 在调试控制台输出详细信息
            console.log('=== 翻译测试结果 ===');
            console.log('API提供商:', apiProvider);
            console.log('目标语言:', targetLanguage);
            console.log('原文:', testText);
            console.log('译文:', translatedText);
            console.log('==================');

        } catch (error) {
            console.error('翻译测试失败:', error);
            vscode.window.showErrorMessage(I18n.t('message.testTranslationFailed', String(error)));
        }
    });

    // 注册WebviewView Provider
    const webviewViewProvider = new TranslateWebviewViewProvider(
        context.extensionUri,
        configManager,
        translationService,
        markdownProcessor
    );
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            TranslateWebviewViewProvider.viewType,
            webviewViewProvider
        )
    );

    // 注册状态栏项
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(globe) ${I18n.t('viewContainer.title')}`;
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
    vscode.window.showInformationMessage(I18n.t('message.commandsRegistered'));
}

export function deactivate() {
    console.log(I18n.t('message.extensionDeactivated'));
}
