import axios from 'axios';
import { ConfigManager } from '../config/configManager';
import { I18n } from '../utils/i18n';

export interface TranslationResult {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export class TranslationService {
    private configManager: ConfigManager;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    async translateText(text: string): Promise<string> {
        const customPrompt = this.configManager.getCustomPrompt();
        if (customPrompt) {
            return await this.translateTextWithPrompt(text, customPrompt);
        }

        const apiProvider = this.configManager.getApiProvider();
        const targetLanguage = this.configManager.getTargetLanguage();

        console.log(I18n.t('log.translationStarted', apiProvider, targetLanguage));
        console.log(I18n.t('log.textLength', text.length.toString()));

        let result: string;
        switch (apiProvider) {
            case 'openai':
                result = await this.translateWithOpenAI(text, targetLanguage);
                break;
            case 'azure':
                result = await this.translateWithAzure(text, targetLanguage);
                break;
            case 'google':
                result = await this.translateWithGoogle(text, targetLanguage);
                break;
            case 'claude':
                result = await this.translateWithClaude(text, targetLanguage);
                break;
            case 'deepseek':
                result = await this.translateWithDeepSeek(text, targetLanguage);
                break;
            default:
                throw new Error(`不支持的API提供商: ${apiProvider}`);
        }

        console.log(`翻译完成，结果长度: ${result.length} 字符`);
        console.log(`翻译结果预览: ${result.substring(0, 100)}...`);

        return result;
    }

    async translateTextWithPrompt(text: string, customPrompt: string): Promise<string> {
        const apiProvider = this.configManager.getApiProvider();
        const targetLanguage = this.configManager.getTargetLanguage();

        // 替换占位符
        const prompt = customPrompt.replace(/{targetLanguage}/g, this._getLanguageName(targetLanguage));

        console.log(I18n.t('log.translationWithCustomPrompt', apiProvider, targetLanguage));
        console.log(I18n.t('log.textLength', text.length.toString()));

        let result: string;
        switch (apiProvider) {
            case 'openai':
                result = await this.translateWithOpenAIPrompt(text, prompt);
                break;
            case 'azure':
                result = await this.translateWithAzurePrompt(text, prompt);
                break;
            case 'google':
                // Google翻译API不支持自定义prompt，使用默认方式
                result = await this.translateWithGoogle(text, targetLanguage);
                break;
            case 'claude':
                result = await this.translateWithClaudePrompt(text, prompt);
                break;
            case 'deepseek':
                result = await this.translateWithDeepSeekPrompt(text, prompt);
                break;
            default:
                throw new Error(`不支持的API提供商: ${apiProvider}`);
        }

        console.log(`翻译完成，结果长度: ${result.length} 字符`);
        console.log(`翻译结果预览: ${result.substring(0, 100)}...`);

        return result;
    }

    private _getLanguageName(languageCode: string): string {
        const languageNames: { [key: string]: string } = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'hi': 'Hindi',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish'
        };
        return languageNames[languageCode] || 'English';
    }

    private async translateWithOpenAI(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.openai.com/v1/chat/completions';

        if (!apiKey) {
            throw new Error(I18n.t('error.apiKeyNotConfigured', 'OpenAI'));
        }

        const languageNames: { [key: string]: string } = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        const response = await axios.post(apiEndpoint, {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Please translate the following Chinese text to ${targetLangName}. Keep the Markdown format and structure exactly the same. Only return the translated text without any explanations or additional content.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    private async translateWithAzure(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint();

        if (!apiKey || !apiEndpoint) {
            throw new Error(I18n.t('error.azureEndpointRequired'));
        }

        const languageNames: { [key: string]: string } = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        const response = await axios.post(apiEndpoint, {
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Please translate the following Chinese text to ${targetLangName}. Keep the Markdown format and structure exactly the same. Only return the translated text without any explanations or additional content.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    private async translateWithGoogle(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();

        if (!apiKey) {
            throw new Error(I18n.t('error.googleApiKeyRequired'));
        }

        const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
            q: text,
            target: targetLanguage,
            source: 'zh',
            format: 'text'
        });

        return response.data.data.translations[0].translatedText;
    }

    private async translateWithClaude(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.anthropic.com/v1/messages';

        if (!apiKey) {
            throw new Error(I18n.t('error.claudeApiKeyRequired'));
        }

        const languageNames: { [key: string]: string } = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        const response = await axios.post(apiEndpoint, {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            messages: [
                {
                    role: 'user',
                    content: `You are a professional translator. Please translate the following Chinese text to ${targetLangName}. Keep the Markdown format and structure exactly the same. Only return the translated text without any explanations or additional content.\n\n${text}`
                }
            ]
        }, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        return response.data.content[0].text.trim();
    }

    private async translateWithDeepSeek(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.deepseek.com/v1/chat/completions';

        if (!apiKey) {
            throw new Error(I18n.t('error.deepseekApiKeyRequired'));
        }

        const languageNames: { [key: string]: string } = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'hi': 'Hindi',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        const response = await axios.post(apiEndpoint, {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Please translate the following Chinese text to ${targetLangName}. Keep the Markdown format and structure exactly the same. Only return the translated text without any explanations or additional content.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    private async translateWithOpenAIPrompt(text: string, customPrompt: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.openai.com/v1/chat/completions';

        if (!apiKey) {
            throw new Error(I18n.t('error.apiKeyNotConfigured', 'OpenAI'));
        }

        const response = await axios.post(apiEndpoint, {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: customPrompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    private async translateWithAzurePrompt(text: string, customPrompt: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint();

        if (!apiKey || !apiEndpoint) {
            throw new Error(I18n.t('error.azureEndpointRequired'));
        }

        const response = await axios.post(apiEndpoint, {
            messages: [
                {
                    role: 'system',
                    content: customPrompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    private async translateWithClaudePrompt(text: string, customPrompt: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.anthropic.com/v1/messages';

        if (!apiKey) {
            throw new Error(I18n.t('error.claudeApiKeyRequired'));
        }

        const response = await axios.post(apiEndpoint, {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            messages: [
                {
                    role: 'user',
                    content: `${customPrompt}\n\n${text}`
                }
            ]
        }, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        return response.data.content[0].text.trim();
    }

    private async translateWithDeepSeekPrompt(text: string, customPrompt: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.deepseek.com/v1/chat/completions';

        if (!apiKey) {
            throw new Error(I18n.t('error.deepseekApiKeyRequired'));
        }

        const response = await axios.post(apiEndpoint, {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: customPrompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    }

    async translateBatch(texts: string[]): Promise<string[]> {
        const results: string[] = [];

        for (const text of texts) {
            try {
                const translated = await this.translateText(text);
                results.push(translated);
            } catch (error) {
                console.error('批量翻译错误:', error);
                results.push(text); // 如果翻译失败，保留原文
            }
        }

        return results;
    }
}
