import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from '../config/configManager';
import { TranslationService } from '../services/translationService';
import { MarkdownProcessor } from '../processors/markdownProcessor';
import { I18n } from '../utils/i18n';

export class TranslatePanel {
    private static readonly viewType = 'ai-translate-wiki.translate';
    private static currentPanel: TranslatePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _configManager: ConfigManager;
    private readonly _translationService: TranslationService;
    private readonly _markdownProcessor: MarkdownProcessor;
    private _currentTranslationToken: vscode.CancellationTokenSource | undefined;

    public static createOrShow(extensionUri: vscode.Uri, configManager: ConfigManager, translationService: TranslationService, markdownProcessor: MarkdownProcessor) {
        const column = vscode.ViewColumn.Beside;

        if (TranslatePanel.currentPanel) {
            TranslatePanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            TranslatePanel.viewType,
            '批量翻译控制台',
            { viewColumn: column, preserveFocus: false },
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ],
                retainContextWhenHidden: true
            }
        );

        TranslatePanel.currentPanel = new TranslatePanel(panel, extensionUri, configManager, translationService, markdownProcessor);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        configManager: ConfigManager,
        translationService: TranslationService,
        markdownProcessor: MarkdownProcessor
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._configManager = configManager;
        this._translationService = translationService;
        this._markdownProcessor = markdownProcessor;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'startTranslation':
                        await this._startTranslation(message.sourcePath, message.outputPath, message.customPrompt);
                        return;
                    case 'cancelTranslation':
                        this._cancelTranslation();
                        return;
                    case 'getCurrentPaths':
                        this._sendCurrentPaths();
                        return;
                    case 'selectSourcePath':
                        await this._selectSourcePath();
                        return;
                    case 'selectOutputPath':
                        await this._selectOutputPath();
                        return;
                }
            },
            null
        );
    }

    public dispose() {
        if (this._currentTranslationToken) {
            this._currentTranslationToken.cancel();
            this._currentTranslationToken.dispose();
        }
        TranslatePanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> ${I18n.t('message.batchTranslationConsole')} </title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        h1 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
        }
        
        .section h2 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            font-size: 16px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: var(--vscode-font-size);
            font-family: var(--vscode-font-family);
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .form-group .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        
        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 25px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
            font-weight: 500;
            transition: background-color 0.2s;
            flex: 1;
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-danger {
            background-color: var(--vscode-errorForeground);
            color: white;
        }
        
        .btn-danger:hover:not(:disabled) {
            background-color: var(--vscode-testing-iconFailed);
        }
        
        .status {
            padding: 12px;
            margin: 15px 0;
            border-radius: 4px;
            display: none;
        }
        
        .status.show {
            display: block;
        }
        
        .status.info {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            color: var(--vscode-foreground);
        }
        
        .status.success {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .status.error {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        
        .status.warning {
            background-color: var(--vscode-notificationsWarningIcon-foreground);
            color: white;
        }
        
        .progress-container {
            margin-top: 15px;
            display: none;
        }
        
        .progress-container.show {
            display: block;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .progress-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-foreground);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }
        
        .path-input-group {
            display: flex;
            gap: 8px;
        }
        
        .path-input-group input {
            flex: 1;
        }
        
        .path-input-group button {
            padding: 10px 16px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            white-space: nowrap;
        }
        
        .path-input-group button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>批量翻译控制台</h1>
        
        <div class="section">
            <h2>路径配置</h2>
            
            <div class="form-group">
                <label for="sourcePath">要翻译的路径</label>
                <div class="path-input-group">
                    <input type="text" id="sourcePath" placeholder="选择或输入要翻译的文件/目录路径">
                    <button onclick="selectSourcePath()">浏览</button>
                </div>
                <div class="help-text">可以输入文件路径或目录路径，支持相对路径和绝对路径</div>
            </div>
            
            <div class="form-group">
                <label for="outputPath">生成文件的路径</label>
                <div class="path-input-group">
                    <input type="text" id="outputPath" placeholder="选择或输入翻译文件的输出路径">
                    <button onclick="selectOutputPath()">浏览</button>
                </div>
                <div class="help-text">翻译后的文件将保存在此路径，如果不存在会自动创建</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Prompt 增强</h2>
            
            <div class="form-group">
                <label for="customPrompt">自定义 Prompt</label>
                <textarea id="customPrompt" placeholder="输入自定义的翻译prompt，这将替换默认的翻译指令。例如：&#10;你是一名专业的技术文档翻译专家。请将以下中文文本翻译成英文，要求：&#10;1. 保持Markdown格式完全不变&#10;2. 专业术语使用标准翻译&#10;3. 代码块和链接保持不变"></textarea>
                <div class="help-text">留空则使用默认的翻译prompt。可以使用 {targetLanguage} 作为占位符，将被替换为实际的目标语言</div>
            </div>
        </div>
        
        <div class="button-group">
            <button class="btn btn-primary" id="startBtn" onclick="startTranslation()">开始翻译</button>
            <button class="btn btn-danger" id="cancelBtn" onclick="cancelTranslation()" disabled>取消翻译</button>
        </div>
        
        <div id="statusMessage" class="status"></div>
        
        <div class="progress-container" id="progressContainer">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">准备中...</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let isTranslating = false;
        
        // 初始化页面
        document.addEventListener('DOMContentLoaded', function() {
            loadCurrentPaths();
        });
        
        function loadCurrentPaths() {
            vscode.postMessage({ command: 'getCurrentPaths' });
        }
        
        function selectSourcePath() {
            vscode.postMessage({ command: 'selectSourcePath' });
        }
        
        function selectOutputPath() {
            vscode.postMessage({ command: 'selectOutputPath' });
        }
        
        function startTranslation() {
            const sourcePath = document.getElementById('sourcePath').value.trim();
            const outputPath = document.getElementById('outputPath').value.trim();
            const customPrompt = document.getElementById('customPrompt').value.trim();
            
            if (!sourcePath) {
                showStatus('请先配置要翻译的路径', 'error');
                return;
            }
            
            if (!outputPath) {
                showStatus('请先配置生成文件的路径', 'error');
                return;
            }
            
            isTranslating = true;
            updateButtonState();
            showProgress(true);
            showStatus('开始翻译...', 'info');
            
            vscode.postMessage({
                command: 'startTranslation',
                sourcePath: sourcePath,
                outputPath: outputPath,
                customPrompt: customPrompt
            });
        }
        
        function cancelTranslation() {
            vscode.postMessage({ command: 'cancelTranslation' });
        }
        
        function showStatus(message, type) {
            const statusElement = document.getElementById('statusMessage');
            statusElement.textContent = message;
            statusElement.className = \`status show \${type}\`;
        }
        
        function showProgress(show) {
            const progressContainer = document.getElementById('progressContainer');
            if (show) {
                progressContainer.classList.add('show');
            } else {
                progressContainer.classList.remove('show');
            }
        }
        
        function updateProgress(percentage, message) {
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            progressFill.style.width = percentage + '%';
            progressText.textContent = message || \`进度: \${percentage}%\`;
        }
        
        function updateButtonState() {
            const startBtn = document.getElementById('startBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            
            if (isTranslating) {
                startBtn.disabled = true;
                cancelBtn.disabled = false;
            } else {
                startBtn.disabled = false;
                cancelBtn.disabled = true;
            }
        }
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updatePaths':
                    if (message.sourcePath) {
                        document.getElementById('sourcePath').value = message.sourcePath;
                    }
                    if (message.outputPath) {
                        document.getElementById('outputPath').value = message.outputPath;
                    }
                    break;
                case 'translationProgress':
                    updateProgress(message.percentage, message.message);
                    break;
                case 'translationComplete':
                    isTranslating = false;
                    updateButtonState();
                    showProgress(false);
                    updateProgress(0, '');
                    showStatus(message.message || '翻译完成！', 'success');
                    break;
                case 'translationError':
                    isTranslating = false;
                    updateButtonState();
                    showProgress(false);
                    updateProgress(0, '');
                    showStatus(message.message || '翻译失败', 'error');
                    break;
                case 'translationCancelled':
                    isTranslating = false;
                    updateButtonState();
                    showProgress(false);
                    updateProgress(0, '');
                    showStatus('翻译已取消', 'warning');
                    break;
            }
        });
        
        updateButtonState();
    </script>
</body>
</html>`;
    }

    private async _startTranslation(sourcePath: string, outputPath: string, customPrompt?: string) {
        try {
            // 创建取消令牌
            const tokenSource = new vscode.CancellationTokenSource();
            this._currentTranslationToken = tokenSource;

            // 更新输出目录配置
            await this._configManager.updateOutputDirectory(outputPath);

            // 如果提供了自定义prompt，保存它
            if (customPrompt) {
                await this._configManager.updateCustomPrompt(customPrompt);
            } else {
                await this._configManager.updateCustomPrompt('');
            }

            // 验证源路径
            const workspaceFolders = vscode.workspace.workspaceFolders;
            let resolvedSourcePath: string;
            let resolvedOutputPath: string;

            if (path.isAbsolute(sourcePath)) {
                resolvedSourcePath = sourcePath;
            } else if (workspaceFolders && workspaceFolders.length > 0) {
                resolvedSourcePath = path.join(workspaceFolders[0].uri.fsPath, sourcePath);
            } else {
                throw new Error('无法解析源路径，请使用绝对路径');
            }

            if (path.isAbsolute(outputPath)) {
                resolvedOutputPath = outputPath;
            } else if (workspaceFolders && workspaceFolders.length > 0) {
                resolvedOutputPath = path.join(workspaceFolders[0].uri.fsPath, outputPath);
            } else {
                throw new Error('无法解析输出路径，请使用绝对路径');
            }

            // 检查源路径是否存在
            if (!fs.existsSync(resolvedSourcePath)) {
                throw new Error(`源路径不存在: ${resolvedSourcePath}`);
            }

            // 确保输出目录存在
            const outputDir = fs.statSync(resolvedSourcePath).isDirectory()
                ? resolvedOutputPath
                : path.dirname(resolvedOutputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 收集要翻译的文件
            const files: vscode.Uri[] = [];
            const sourceStat = fs.statSync(resolvedSourcePath);

            if (sourceStat.isFile()) {
                // 单个文件
                if (resolvedSourcePath.endsWith('.md')) {
                    files.push(vscode.Uri.file(resolvedSourcePath));
                }
            } else if (sourceStat.isDirectory()) {
                // 目录，查找所有md文件
                const pattern = new vscode.RelativePattern(resolvedSourcePath, '**/*.md');
                const foundFiles = await vscode.workspace.findFiles(pattern, null, 1000);
                files.push(...foundFiles);
            }

            if (files.length === 0) {
                throw new Error('没有找到要翻译的Markdown文件');
            }

            // 确保输出目录存在
            const isOutputAbsolute = path.isAbsolute(resolvedOutputPath);
            const outputBaseDir = isOutputAbsolute ? resolvedOutputPath :
                (workspaceFolders && workspaceFolders.length > 0 ?
                    path.join(workspaceFolders[0].uri.fsPath, resolvedOutputPath) :
                    resolvedOutputPath);

            if (!fs.existsSync(outputBaseDir)) {
                fs.mkdirSync(outputBaseDir, { recursive: true });
            }

            // 更新进度显示
            this._panel.webview.postMessage({
                command: 'translationProgress',
                percentage: 0,
                message: `找到 ${files.length} 个文件，开始翻译...`
            });

            // 开始翻译
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在批量翻译...",
                cancellable: true
            }, async (progress, token) => {
                // 合并取消令牌
                const combinedToken = tokenSource.token;

                for (let i = 0; i < files.length; i++) {
                    if (combinedToken.isCancellationRequested || token.isCancellationRequested) {
                        this._panel.webview.postMessage({
                            command: 'translationCancelled',
                            message: '翻译已取消'
                        });
                        return;
                    }

                    const file = files[i];
                    const document = await vscode.workspace.openTextDocument(file);

                    const progressPercentage = Math.round(((i + 1) / files.length) * 100);
                    const progressMessage = `正在翻译 ${path.basename(file.fsPath)} (${i + 1}/${files.length})`;

                    progress.report({
                        message: progressMessage,
                        increment: (100 / files.length)
                    });

                    // 更新webview进度
                    this._panel.webview.postMessage({
                        command: 'translationProgress',
                        percentage: progressPercentage,
                        message: progressMessage
                    });

                    try {
                        // 临时设置输出目录，以便保存到指定位置
                        const originalOutputDir = this._configManager.getOutputDirectory();
                        await this._configManager.updateOutputDirectory(resolvedOutputPath);

                        // 使用自定义prompt进行翻译
                        await this._translateFileWithCustomPrompt(document, progress, combinedToken, customPrompt);

                        // 恢复原始输出目录
                        await this._configManager.updateOutputDirectory(originalOutputDir);
                    } catch (error) {
                        console.error(`翻译文件 ${file.fsPath} 失败:`, error);
                        // 继续翻译下一个文件
                    }
                }

                this._panel.webview.postMessage({
                    command: 'translationComplete',
                    message: `翻译完成！共处理 ${files.length} 个文件`
                });
            });

        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'translationError',
                message: `翻译失败: ${error.message || error}`
            });
        } finally {
            if (this._currentTranslationToken) {
                this._currentTranslationToken.dispose();
                this._currentTranslationToken = undefined;
            }
        }
    }

    private async _translateFileWithCustomPrompt(
        document: vscode.TextDocument,
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken,
        customPrompt?: string
    ): Promise<void> {
        // 如果提供了自定义prompt，先保存它
        if (customPrompt) {
            await this._configManager.updateCustomPrompt(customPrompt);
        } else {
            await this._configManager.updateCustomPrompt('');
        }

        // 直接使用markdownProcessor，它会从configManager中读取customPrompt
        await this._markdownProcessor.translateFile(document, progress, token);
    }

    private _cancelTranslation() {
        if (this._currentTranslationToken) {
            this._currentTranslationToken.cancel();
        }
        this._panel.webview.postMessage({
            command: 'translationCancelled',
            message: '翻译已取消'
        });
    }

    private async _selectSourcePath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: true,
            canSelectFolders: true,
            openLabel: '选择'
        };

        if (workspaceFolders && workspaceFolders.length > 0) {
            options.defaultUri = workspaceFolders[0].uri;
        }

        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const workspaceFolder = workspaceFolders?.[0];
            let relativePath = fileUri[0].fsPath;

            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                if (relativePath.startsWith(workspacePath)) {
                    relativePath = path.relative(workspacePath, relativePath);
                    if (!relativePath.startsWith('..')) {
                        relativePath = './' + relativePath.replace(/\\/g, '/');
                    }
                }
            }

            this._panel.webview.postMessage({
                command: 'updatePaths',
                sourcePath: relativePath
            });
        }
    }

    private async _selectOutputPath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: '选择'
        };

        if (workspaceFolders && workspaceFolders.length > 0) {
            options.defaultUri = workspaceFolders[0].uri;
        }

        const folderUri = await vscode.window.showOpenDialog(options);
        if (folderUri && folderUri[0]) {
            const workspaceFolder = workspaceFolders?.[0];
            let relativePath = folderUri[0].fsPath;

            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                if (relativePath.startsWith(workspacePath)) {
                    relativePath = path.relative(workspacePath, relativePath);
                    if (!relativePath.startsWith('..')) {
                        relativePath = './' + relativePath.replace(/\\/g, '/');
                    }
                }
            }

            this._panel.webview.postMessage({
                command: 'updatePaths',
                outputPath: relativePath
            });
        }
    }

    private _sendCurrentPaths() {
        const inputDirectory = this._configManager.getInputDirectory();
        const outputDirectory = this._configManager.getOutputDirectory();

        this._panel.webview.postMessage({
            command: 'updatePaths',
            sourcePath: inputDirectory,
            outputPath: outputDirectory
        });
    }

}

