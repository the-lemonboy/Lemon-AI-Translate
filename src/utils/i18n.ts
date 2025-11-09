import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 国际化工具类
 * 使用 VSCode 的 l10n API 或直接读取 package.nls.json 文件
 */
export class I18n {
    private static _localizedStrings: { [key: string]: string } | null = null;
    private static _language: string = 'en';

    /**
     * 初始化本地化字符串
     */
    private static _loadLocalizedStrings(): { [key: string]: string } {
        if (I18n._localizedStrings !== null) {
            return I18n._localizedStrings;
        }

        I18n._localizedStrings = {};

        try {
            // 获取 VSCode 的语言设置
            const language = vscode.env.language.toLowerCase();
            I18n._language = language;

            // 获取扩展路径
            const extensionId = 'ai-translate-wiki';
            const extension = vscode.extensions.getExtension(extensionId);
            let extensionPath: string;

            if (extension && extension.extensionPath) {
                extensionPath = extension.extensionPath;
            } else {
                // 如果无法获取扩展路径，使用 __dirname 作为后备方案
                extensionPath = path.resolve(__dirname, '../..');
            }

            // 确定要使用的语言文件
            let nlsFile: string;
            if (language.startsWith('zh')) {
                nlsFile = path.join(extensionPath, 'package.nls.zh-cn.json');
            } else {
                nlsFile = path.join(extensionPath, 'package.nls.json');
            }

            // 读取本地化文件
            if (fs.existsSync(nlsFile)) {
                const content = fs.readFileSync(nlsFile, 'utf8');
                I18n._localizedStrings = JSON.parse(content);
            } else {
                // 如果找不到对应语言文件，使用默认的英文文件
                const defaultFile = path.join(extensionPath, 'package.nls.json');
                if (fs.existsSync(defaultFile)) {
                    const content = fs.readFileSync(defaultFile, 'utf8');
                    I18n._localizedStrings = JSON.parse(content);
                } else {
                    console.warn(`Localization file not found: ${nlsFile}`);
                    I18n._localizedStrings = {};
                }
            }
        } catch (error) {
            console.error('Failed to load localized strings:', error);
            I18n._localizedStrings = {};
        }

        return I18n._localizedStrings || {};
    }

    /**
     * 获取本地化字符串
     * @param key 本地化键
     * @param args 替换参数
     * @returns 本地化后的字符串
     */
    static t(key: string, ...args: (string | number)[]): string {
        try {
            // 首先尝试使用 VSCode 的 l10n API（如果可用）
            if (vscode.l10n && typeof vscode.l10n.t === 'function') {
                const message = vscode.l10n.t(key, ...args);
                if (message !== key) {
                    return message;
                }
            }
        } catch (error) {
            // l10n API 不可用，继续使用文件读取方式
        }

        // 从本地化文件读取
        const strings = I18n._loadLocalizedStrings();
        let message = strings[key] || key;

        // 替换参数 {0}, {1}, {2} 等
        if (args.length > 0) {
            for (let i = 0; i < args.length; i++) {
                message = message.replace(new RegExp(`\\{${i}\\}`, 'g'), String(args[i]));
            }
        }

        return message;
    }

    /**
     * 获取本地化字符串（支持命名参数）
     * @param key 本地化键
     * @param args 命名参数对象
     * @returns 本地化后的字符串
     */
    static tNamed(key: string, args: Record<string, string | number>): string {
        try {
            // 首先尝试使用 VSCode 的 l10n API
            if (vscode.l10n && typeof vscode.l10n.t === 'function') {
                let message = vscode.l10n.t(key);
                if (message !== key) {
                    // 替换命名参数
                    for (const [name, value] of Object.entries(args)) {
                        message = message.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
                    }
                    return message;
                }
            }
        } catch (error) {
            // l10n API 不可用，继续使用文件读取方式
        }

        // 从本地化文件读取
        const strings = I18n._loadLocalizedStrings();
        let message = strings[key] || key;

        // 替换命名参数
        for (const [name, value] of Object.entries(args)) {
            message = message.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
        }

        return message;
    }
}

