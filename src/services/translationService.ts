import axios from 'axios';
import { ConfigManager } from '../config/configManager';

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
        const apiProvider = this.configManager.getApiProvider();
        const targetLanguage = this.configManager.getTargetLanguage();

        console.log(`开始翻译，API提供商: ${apiProvider}, 目标语言: ${targetLanguage}`);
        console.log(`原文长度: ${text.length} 字符`);

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

    private async translateWithOpenAI(text: string, targetLanguage: string): Promise<string> {
        const apiKey = this.configManager.getApiKey();
        const apiEndpoint = this.configManager.getApiEndpoint() || 'https://api.openai.com/v1/chat/completions';

        if (!apiKey) {
            throw new Error('请先配置OpenAI API密钥');
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
            throw new Error('请先配置Azure OpenAI API密钥和端点');
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
            throw new Error('请先配置Google Translate API密钥');
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
            throw new Error('请先配置Claude API密钥');
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
            throw new Error('请先配置DeepSeek API密钥');
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
