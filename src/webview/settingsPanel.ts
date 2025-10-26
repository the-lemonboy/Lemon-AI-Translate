import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';

export class SettingsPanel {
    private static readonly viewType = 'ai-translate-wiki.settings';
    private static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _configManager: ConfigManager;

    public static createOrShow(extensionUri: vscode.Uri, configManager: ConfigManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SettingsPanel.viewType,
            'AI翻译设置',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri, configManager);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, configManager: ConfigManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._configManager = configManager;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null);
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'saveSettings':
                        this._saveSettings(message.settings);
                        return;
                    case 'testConnection':
                        this._testConnection(message.apiKey, message.apiProvider, message.apiEndpoint);
                        return;
                    case 'getCurrentSettings':
                        this._sendCurrentSettings();
                        return;
                }
            },
            null
        );
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
        );

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI翻译设置</title>
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
            max-width: 800px;
            margin: 0 auto;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
        }
        
        .section h2 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: var(--vscode-font-size);
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-group .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
        }
        
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
            transition: background-color 0.2s;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            display: none;
        }
        
        .status.success {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .status.error {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        
        .language-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .language-option {
            padding: 8px 12px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .language-option:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .language-option.selected {
            background-color: var(--vscode-textLink-foreground);
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI翻译设置</h1>
        
        <div class="section">
            <h2>API配置</h2>
            
            <div class="form-group">
                <label for="apiProvider">翻译服务提供商</label>
                <select id="apiProvider">
                    <option value="openai">OpenAI GPT</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="google">Google Translate</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="deepseek">DeepSeek</option>
                </select>
                <div class="help-text">选择您要使用的AI翻译服务</div>
            </div>
            
            <div class="form-group">
                <label for="apiKey">API密钥</label>
                <input type="password" id="apiKey" placeholder="请输入您的API密钥">
                <div class="help-text">您的API密钥将安全存储在VSCode设置中</div>
            </div>
            
            <div class="form-group" id="apiEndpointGroup" style="display: none;">
                <label for="apiEndpoint">API端点</label>
                <input type="text" id="apiEndpoint" placeholder="https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions">
                <div class="help-text">Azure OpenAI需要配置完整的API端点URL</div>
            </div>
            
            <div class="button-group">
                <button class="btn btn-secondary" onclick="testConnection()">测试连接</button>
            </div>
            
            <div id="connectionStatus" class="status"></div>
        </div>
        
        <div class="section">
            <h2>文件配置</h2>
            
            <div class="form-group">
                <label for="inputDirectory">输入文件目录</label>
                <input type="text" id="inputDirectory" placeholder="./">
                <div class="help-text">要翻译的文件所在目录，支持相对路径和绝对路径</div>
            </div>
            
            <div class="form-group">
                <label for="filePattern">文件匹配模式</label>
                <input type="text" id="filePattern" placeholder="**/*.md">
                <div class="help-text">使用glob语法匹配文件，如：*.md, **/*.md, docs/**/*.txt</div>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="recursiveSearch" checked>
                <label for="recursiveSearch">递归搜索子目录</label>
            </div>
        </div>
        
        <div class="section">
            <h2>翻译设置</h2>
            
            <div class="form-group">
                <label>目标语言</label>
                <div class="language-grid" id="languageGrid">
                    <!-- 语言选项将通过JavaScript动态生成 -->
                </div>
            </div>
            
            <div class="form-group">
                <label for="outputDirectory">输出目录</label>
                <input type="text" id="outputDirectory" placeholder="./translated">
                <div class="help-text">翻译文件的保存目录，可以是相对路径或绝对路径</div>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="preserveFormatting" checked>
                <label for="preserveFormatting">保持Markdown格式</label>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="translateCodeBlocks">
                <label for="translateCodeBlocks">翻译代码块中的注释</label>
            </div>
            
            <div class="form-group">
                <label for="batchSize">批量翻译大小</label>
                <input type="number" id="batchSize" min="1" max="20" value="5">
                <div class="help-text">每次批量翻译的段落数量，建议5-10段</div>
            </div>
        </div>
        
        <div class="button-group">
            <button class="btn btn-primary" onclick="saveSettings()">保存设置</button>
            <button class="btn btn-secondary" onclick="resetSettings()">重置设置</button>
        </div>
        
        <div id="saveStatus" class="status"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // 支持的语言列表
        const supportedLanguages = {
            'en': 'English (英语)',
            'ja': 'Japanese (日语)',
            'ko': 'Korean (韩语)',
            'fr': 'French (法语)',
            'de': 'German (德语)',
            'es': 'Spanish (西班牙语)',
            'it': 'Italian (意大利语)',
            'pt': 'Portuguese (葡萄牙语)',
            'ru': 'Russian (俄语)',
            'ar': 'Arabic (阿拉伯语)',
            'th': 'Thai (泰语)',
            'vi': 'Vietnamese (越南语)',
            'hi': 'Hindi (印地语)',
            'tr': 'Turkish (土耳其语)',
            'pl': 'Polish (波兰语)',
            'nl': 'Dutch (荷兰语)',
            'sv': 'Swedish (瑞典语)',
            'da': 'Danish (丹麦语)',
            'no': 'Norwegian (挪威语)',
            'fi': 'Finnish (芬兰语)'
        };
        
        let currentSettings = {};
        
        // 初始化页面
        document.addEventListener('DOMContentLoaded', function() {
            generateLanguageOptions();
            setupEventListeners();
            loadCurrentSettings();
        });
        
        function generateLanguageOptions() {
            const languageGrid = document.getElementById('languageGrid');
            languageGrid.innerHTML = '';
            
            for (const [code, name] of Object.entries(supportedLanguages)) {
                const option = document.createElement('div');
                option.className = 'language-option';
                option.dataset.code = code;
                option.textContent = name;
                option.onclick = () => selectLanguage(code);
                languageGrid.appendChild(option);
            }
        }
        
        function selectLanguage(code) {
            // 移除所有选中状态
            document.querySelectorAll('.language-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // 选中当前语言
            document.querySelector(\`[data-code="\${code}"]\`).classList.add('selected');
        }
        
        function setupEventListeners() {
            // API提供商变化时显示/隐藏端点输入
            document.getElementById('apiProvider').addEventListener('change', function() {
                const endpointGroup = document.getElementById('apiEndpointGroup');
                if (this.value === 'azure') {
                    endpointGroup.style.display = 'block';
                } else {
                    endpointGroup.style.display = 'none';
                }
            });
        }
        
        function loadCurrentSettings() {
            vscode.postMessage({ command: 'getCurrentSettings' });
        }
        
        function saveSettings() {
            const settings = {
                apiProvider: document.getElementById('apiProvider').value,
                apiKey: document.getElementById('apiKey').value,
                apiEndpoint: document.getElementById('apiEndpoint').value,
                targetLanguage: document.querySelector('.language-option.selected')?.dataset.code || 'en',
                outputDirectory: document.getElementById('outputDirectory').value,
                preserveFormatting: document.getElementById('preserveFormatting').checked,
                translateCodeBlocks: document.getElementById('translateCodeBlocks').checked,
                batchSize: parseInt(document.getElementById('batchSize').value),
                inputDirectory: document.getElementById('inputDirectory').value,
                filePattern: document.getElementById('filePattern').value,
                recursiveSearch: document.getElementById('recursiveSearch').checked
            };
            
            vscode.postMessage({ command: 'saveSettings', settings: settings });
        }
        
        function resetSettings() {
            // 重置为默认值
            document.getElementById('apiProvider').value = 'openai';
            document.getElementById('apiKey').value = '';
            document.getElementById('apiEndpoint').value = '';
            document.getElementById('outputDirectory').value = './translated';
            document.getElementById('preserveFormatting').checked = true;
            document.getElementById('translateCodeBlocks').checked = false;
            document.getElementById('batchSize').value = '5';
            document.getElementById('inputDirectory').value = './';
            document.getElementById('filePattern').value = '**/*.md';
            document.getElementById('recursiveSearch').checked = true;
            
            // 重置语言选择
            selectLanguage('en');
            
            showStatus('saveStatus', '设置已重置', 'success');
        }
        
        function testConnection() {
            const apiKey = document.getElementById('apiKey').value;
            const apiProvider = document.getElementById('apiProvider').value;
            const apiEndpoint = document.getElementById('apiEndpoint').value;
            
            if (!apiKey) {
                showStatus('connectionStatus', '请先输入API密钥', 'error');
                return;
            }
            
            vscode.postMessage({ 
                command: 'testConnection', 
                apiKey: apiKey,
                apiProvider: apiProvider,
                apiEndpoint: apiEndpoint
            });
        }
        
        function showStatus(elementId, message, type) {
            const statusElement = document.getElementById(elementId);
            statusElement.textContent = message;
            statusElement.className = \`status \${type}\`;
            statusElement.style.display = 'block';
            
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateSettings':
                    updateSettingsUI(message.settings);
                    break;
                case 'connectionResult':
                    showStatus('connectionStatus', message.message, message.success ? 'success' : 'error');
                    break;
                case 'saveResult':
                    showStatus('saveStatus', message.message, message.success ? 'success' : 'error');
                    break;
            }
        });
        
        function updateSettingsUI(settings) {
            document.getElementById('apiProvider').value = settings.apiProvider || 'openai';
            document.getElementById('apiKey').value = settings.apiKey || '';
            document.getElementById('apiEndpoint').value = settings.apiEndpoint || '';
            document.getElementById('outputDirectory').value = settings.outputDirectory || './translated';
            document.getElementById('preserveFormatting').checked = settings.preserveFormatting !== false;
            document.getElementById('translateCodeBlocks').checked = settings.translateCodeBlocks || false;
            document.getElementById('batchSize').value = settings.batchSize || 5;
            document.getElementById('inputDirectory').value = settings.inputDirectory || './';
            document.getElementById('filePattern').value = settings.filePattern || '**/*.md';
            document.getElementById('recursiveSearch').checked = settings.recursiveSearch !== false;
            
            selectLanguage(settings.targetLanguage || 'en');
            
            // 显示/隐藏API端点输入
            const endpointGroup = document.getElementById('apiEndpointGroup');
            if (settings.apiProvider === 'azure' || settings.apiProvider === 'deepseek') {
                endpointGroup.style.display = 'block';
            } else {
                endpointGroup.style.display = 'none';
            }
        }
    </script>
</body>
</html>`;
    }

    private async _saveSettings(settings: any) {
        try {
            await this._configManager.updateApiProvider(settings.apiProvider);
            await this._configManager.updateApiKey(settings.apiKey);
            await this._configManager.updateApiEndpoint(settings.apiEndpoint);
            await this._configManager.updateTargetLanguage(settings.targetLanguage);
            await this._configManager.updateOutputDirectory(settings.outputDirectory);
            await this._configManager.updatePreserveFormatting(settings.preserveFormatting);
            await this._configManager.updateTranslateCodeBlocks(settings.translateCodeBlocks);
            await this._configManager.updateBatchSize(settings.batchSize);
            await this._configManager.updateInputDirectory(settings.inputDirectory);
            await this._configManager.updateFilePattern(settings.filePattern);
            await this._configManager.updateRecursiveSearch(settings.recursiveSearch);

            this._panel.webview.postMessage({
                command: 'saveResult',
                success: true,
                message: '设置保存成功！'
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'saveResult',
                success: false,
                message: `保存失败: ${error}`
            });
        }
    }

    private async _testConnection(apiKey: string, apiProvider: string, apiEndpoint: string) {
        try {
            // 这里可以添加实际的连接测试逻辑
            // 为了演示，我们模拟一个测试
            await new Promise(resolve => setTimeout(resolve, 1000));

            this._panel.webview.postMessage({
                command: 'connectionResult',
                success: true,
                message: '连接测试成功！'
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'connectionResult',
                success: false,
                message: `连接测试失败: ${error}`
            });
        }
    }

    private _sendCurrentSettings() {
        const settings = {
            apiProvider: this._configManager.getApiProvider(),
            apiKey: this._configManager.getApiKey(),
            apiEndpoint: this._configManager.getApiEndpoint(),
            targetLanguage: this._configManager.getTargetLanguage(),
            outputDirectory: this._configManager.getOutputDirectory(),
            preserveFormatting: this._configManager.getPreserveFormatting(),
            translateCodeBlocks: this._configManager.getTranslateCodeBlocks(),
            batchSize: this._configManager.getBatchSize(),
            inputDirectory: this._configManager.getInputDirectory(),
            filePattern: this._configManager.getFilePattern(),
            recursiveSearch: this._configManager.getRecursiveSearch()
        };

        this._panel.webview.postMessage({
            command: 'updateSettings',
            settings: settings
        });
    }
}
