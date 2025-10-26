import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { marked } from 'marked';
import { TranslationService } from '../services/translationService';
import { ConfigManager } from '../config/configManager';

export interface MarkdownSection {
    type: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table' | 'other';
    content: string;
    level?: number;
    shouldTranslate: boolean;
}

export class MarkdownProcessor {
    private translationService: TranslationService;
    private configManager: ConfigManager;

    constructor(translationService: TranslationService, configManager: ConfigManager) {
        this.translationService = translationService;
        this.configManager = configManager;
    }

    async translateFile(document: vscode.TextDocument, progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken): Promise<void> {
        const content = document.getText();
        const sections = this.parseMarkdown(content);

        const translatableSections = sections.filter(section => section.shouldTranslate);
        const totalSections = translatableSections.length;

        if (totalSections === 0) {
            vscode.window.showWarningMessage('没有找到需要翻译的内容');
            return;
        }

        const batchSize = this.configManager.getBatchSize();
        const translatedSections: MarkdownSection[] = [];

        for (let i = 0; i < totalSections; i += batchSize) {
            if (token.isCancellationRequested) {
                return;
            }

            const batch = translatableSections.slice(i, i + batchSize);
            const batchTexts = batch.map(section => section.content);

            progress.report({
                message: `正在翻译第 ${i + 1}-${Math.min(i + batchSize, totalSections)} 段内容...`,
                increment: (batchSize / totalSections) * 100
            });

            try {
                const translatedTexts = await this.translationService.translateBatch(batchTexts);

                for (let j = 0; j < batch.length; j++) {
                    translatedSections.push({
                        ...batch[j],
                        content: translatedTexts[j]
                    });
                }
            } catch (error) {
                console.error('批量翻译错误:', error);
                // 如果批量翻译失败，尝试单独翻译
                for (const section of batch) {
                    try {
                        const translated = await this.translationService.translateText(section.content);
                        translatedSections.push({
                            ...section,
                            content: translated
                        });
                    } catch (singleError) {
                        console.error('单独翻译错误:', singleError);
                        translatedSections.push(section); // 保留原文
                    }
                }
            }
        }

        // 重建文档内容
        console.log('开始重建文档...');
        console.log('原文段落数量:', sections.length);
        console.log('翻译段落数量:', translatedSections.length);

        const translatedContent = this.rebuildMarkdown(sections, translatedSections);

        console.log('重建后的内容长度:', translatedContent.length);
        console.log('重建后内容预览:', translatedContent.substring(0, 200));

        // 保存翻译后的文件
        await this.saveTranslatedFile(document, translatedContent);
    }

    private parseMarkdown(content: string): MarkdownSection[] {
        const sections: MarkdownSection[] = [];
        const lines = content.split('\n');
        let currentSection: MarkdownSection | null = null;
        let inCodeBlock = false;
        let codeBlockLanguage = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 检查代码块
            if (trimmedLine.startsWith('```')) {
                if (!inCodeBlock) {
                    // 开始代码块
                    inCodeBlock = true;
                    codeBlockLanguage = trimmedLine.slice(3).trim();

                    if (currentSection) {
                        sections.push(currentSection);
                    }

                    currentSection = {
                        type: 'code',
                        content: line + '\n',
                        shouldTranslate: this.configManager.getTranslateCodeBlocks()
                    };
                } else {
                    // 结束代码块
                    inCodeBlock = false;
                    if (currentSection) {
                        currentSection.content += line;
                        sections.push(currentSection);
                        currentSection = null;
                    }
                }
                continue;
            }

            if (inCodeBlock) {
                // 在代码块内
                if (currentSection) {
                    currentSection.content += line + '\n';
                }
                continue;
            }

            // 检查标题
            if (trimmedLine.startsWith('#')) {
                if (currentSection) {
                    sections.push(currentSection);
                }

                const level = trimmedLine.match(/^#+/)?.[0].length || 1;
                currentSection = {
                    type: 'heading',
                    content: line,
                    level,
                    shouldTranslate: true
                };
                continue;
            }

            // 检查列表项
            if (trimmedLine.match(/^[\-\*\+]\s/) || trimmedLine.match(/^\d+\.\s/)) {
                if (!currentSection || currentSection.type !== 'list') {
                    if (currentSection) {
                        sections.push(currentSection);
                    }
                    currentSection = {
                        type: 'list',
                        content: line,
                        shouldTranslate: true
                    };
                } else {
                    currentSection.content += '\n' + line;
                }
                continue;
            }

            // 检查引用
            if (trimmedLine.startsWith('>')) {
                if (!currentSection || currentSection.type !== 'blockquote') {
                    if (currentSection) {
                        sections.push(currentSection);
                    }
                    currentSection = {
                        type: 'blockquote',
                        content: line,
                        shouldTranslate: true
                    };
                } else {
                    currentSection.content += '\n' + line;
                }
                continue;
            }

            // 检查表格
            if (trimmedLine.includes('|')) {
                if (!currentSection || currentSection.type !== 'table') {
                    if (currentSection) {
                        sections.push(currentSection);
                    }
                    currentSection = {
                        type: 'table',
                        content: line,
                        shouldTranslate: true
                    };
                } else {
                    currentSection.content += '\n' + line;
                }
                continue;
            }

            // 空行
            if (trimmedLine === '') {
                if (currentSection) {
                    currentSection.content += '\n' + line;
                }
                continue;
            }

            // 普通段落
            if (!currentSection || currentSection.type !== 'paragraph') {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    type: 'paragraph',
                    content: line,
                    shouldTranslate: true
                };
            } else {
                currentSection.content += '\n' + line;
            }
        }

        // 添加最后一个段落
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    private rebuildMarkdown(originalSections: MarkdownSection[], translatedSections: MarkdownSection[]): string {
        // 创建一个映射，将原文段落映射到翻译结果
        const translationMap = new Map<string, string>();

        // 由于translatedSections的顺序与translatableSections相同，我们可以直接按顺序映射
        const translatableSections = originalSections.filter(section => section.shouldTranslate);

        for (let i = 0; i < Math.min(translatableSections.length, translatedSections.length); i++) {
            const originalSection = translatableSections[i];
            const translatedSection = translatedSections[i];
            translationMap.set(originalSection.content, translatedSection.content);
        }

        let result = '';
        for (const section of originalSections) {
            if (section.shouldTranslate && translationMap.has(section.content)) {
                result += translationMap.get(section.content) + '\n';
            } else {
                result += section.content + '\n';
            }
        }

        return result.trim();
    }

    private async saveTranslatedFile(originalDocument: vscode.TextDocument, translatedContent: string): Promise<void> {
        const targetLanguage = this.configManager.getTargetLanguage();
        const outputDirectory = this.configManager.getOutputDirectory();
        const originalPath = originalDocument.uri.fsPath;
        const originalDir = path.dirname(originalPath);
        const originalName = path.basename(originalPath, path.extname(originalPath));
        const originalExt = path.extname(originalPath);

        // 确定输出目录
        let outputDir: string;
        if (path.isAbsolute(outputDirectory)) {
            outputDir = outputDirectory;
        } else {
            outputDir = path.join(originalDir, outputDirectory);
        }

        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 生成翻译文件名
        const translatedFileName = `${originalName}_${targetLanguage}${originalExt}`;
        const translatedFilePath = path.join(outputDir, translatedFileName);

        // 写入翻译文件
        fs.writeFileSync(translatedFilePath, translatedContent, 'utf8');

        // 在VSCode中打开翻译后的文件
        const translatedUri = vscode.Uri.file(translatedFilePath);
        await vscode.window.showTextDocument(translatedUri);
    }

    // 检查文本是否包含中文字符
    private containsChinese(text: string): boolean {
        return /[\u4e00-\u9fff]/.test(text);
    }

    // 获取文件的语言信息
    async detectLanguage(content: string): Promise<{ isChinese: boolean; confidence: number }> {
        const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
        const totalChars = content.replace(/\s/g, '').length;
        const confidence = totalChars > 0 ? chineseChars / totalChars : 0;

        return {
            isChinese: confidence > 0.3,
            confidence
        };
    }
}
