import * as vscode from 'vscode';

export class ConfigManager {
    private static readonly CONFIG_SECTION = 'ai-translate-wiki';

    getApiProvider(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('apiProvider', 'openai');
    }

    getApiKey(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('apiKey', '');
    }

    getApiEndpoint(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('apiEndpoint', '');
    }

    getTargetLanguage(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('targetLanguage', 'en');
    }

    getOutputDirectory(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('outputDirectory', './translated');
    }

    getPreserveFormatting(): boolean {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('preserveFormatting', true);
    }

    getTranslateCodeBlocks(): boolean {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('translateCodeBlocks', false);
    }

    getBatchSize(): number {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('batchSize', 5);
    }

    getInputDirectory(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('inputDirectory', './');
    }

    getFilePattern(): string {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('filePattern', '**/*.md');
    }

    getRecursiveSearch(): boolean {
        return vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).get('recursiveSearch', true);
    }

    async updateApiProvider(provider: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('apiProvider', provider, vscode.ConfigurationTarget.Global);
    }

    async updateApiKey(key: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('apiKey', key, vscode.ConfigurationTarget.Global);
    }

    async updateApiEndpoint(endpoint: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('apiEndpoint', endpoint, vscode.ConfigurationTarget.Global);
    }

    async updateTargetLanguage(language: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('targetLanguage', language, vscode.ConfigurationTarget.Global);
    }

    async updateOutputDirectory(directory: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('outputDirectory', directory, vscode.ConfigurationTarget.Global);
    }

    async updatePreserveFormatting(preserve: boolean): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('preserveFormatting', preserve, vscode.ConfigurationTarget.Global);
    }

    async updateTranslateCodeBlocks(translate: boolean): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('translateCodeBlocks', translate, vscode.ConfigurationTarget.Global);
    }

    async updateBatchSize(size: number): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('batchSize', size, vscode.ConfigurationTarget.Global);
    }

    async updateInputDirectory(directory: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('inputDirectory', directory, vscode.ConfigurationTarget.Global);
    }

    async updateFilePattern(pattern: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('filePattern', pattern, vscode.ConfigurationTarget.Global);
    }

    async updateRecursiveSearch(recursive: boolean): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update('recursiveSearch', recursive, vscode.ConfigurationTarget.Global);
    }

    // 获取支持的语言列表
    getSupportedLanguages(): { [key: string]: string } {
        return {
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
    }

    // 验证配置
    validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.getApiKey()) {
            errors.push('API密钥未配置');
        }

        const apiProvider = this.getApiProvider();
        if (apiProvider === 'azure' && !this.getApiEndpoint()) {
            errors.push('Azure OpenAI需要配置API端点');
        }

        const targetLanguage = this.getTargetLanguage();
        const supportedLanguages = this.getSupportedLanguages();
        if (!supportedLanguages[targetLanguage]) {
            errors.push(`不支持的目标语言: ${targetLanguage}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
