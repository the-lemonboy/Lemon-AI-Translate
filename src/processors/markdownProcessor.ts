import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { marked } from 'marked';
import { TranslationService } from '../services/translationService';
import { ConfigManager } from '../config/configManager';
import { I18n } from '../utils/i18n';

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
            vscode.window.showWarningMessage(I18n.t('message.noContentToTranslate'));
            return;
        }

        // 合并所有需要翻译的内容
        const translatableContent = translatableSections.map(section => section.content).join('\n\n');

        // 计算token数量（粗略估算）
        const estimatedTokens = this.estimateTokenCount(translatableContent);
        const maxTokens = 3000; // 预留1000 tokens给prompt，总限制通常是4000
        const promptTokens = 500; // prompt大概占用500 tokens

        console.log(I18n.t('log.estimatedTokens', estimatedTokens.toString(), maxTokens.toString(), promptTokens.toString()));

        let translatedContent: string;

        // 如果token数不超过限制，整个文件一次性翻译
        if (estimatedTokens + promptTokens <= maxTokens) {
            progress.report({
                message: I18n.t('message.translatingEntireFile'),
                increment: 50
            });

            try {
                // 将整个可翻译内容作为单一文本翻译
                const fullTranslatedText = await this.translationService.translateText(translatableContent);

                // 将翻译后的文本按照原内容的段落结构分割
                // 使用原文本的段落分隔符来分割翻译结果
                const originalParagraphs = translatableSections.map(s => s.content);
                const translatedParagraphs = this.splitTranslatedText(fullTranslatedText, originalParagraphs);

                // 重建翻译后的sections，保持原有结构
                const translatedSections: MarkdownSection[] = [];
                let translatedIndex = 0;

                for (const section of sections) {
                    if (section.shouldTranslate && translatedIndex < translatedParagraphs.length) {
                        translatedSections.push({
                            ...section,
                            content: translatedParagraphs[translatedIndex]
                        });
                        translatedIndex++;
                    } else {
                        translatedSections.push(section);
                    }
                }

                translatedContent = this.rebuildMarkdown(sections, translatedSections);
            } catch (error) {
                console.error('整文件翻译错误:', error);
                throw error;
            }
        } else {
            // 如果超过限制，使用分批翻译方式（仅在文件超大时使用）
            console.log(I18n.t('message.fileTooLarge'));
            const batchSize = 10; // 固定批次大小，文件过大时分批处理
            const translatedSections: MarkdownSection[] = [];

            for (let i = 0; i < totalSections; i += batchSize) {
                if (token.isCancellationRequested) {
                    return;
                }

                const batch = translatableSections.slice(i, i + batchSize);
                const batchTexts = batch.map(section => section.content);

                progress.report({
                    message: I18n.t('message.translatingSection', (i + 1).toString(), Math.min(i + batchSize, totalSections).toString()),
                    increment: (batchSize / totalSections) * 50
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

            translatedContent = this.rebuildMarkdown(sections, translatedSections);
        }

        progress.report({
            message: I18n.t('message.savingFile'),
            increment: 50
        });

        console.log(I18n.t('log.translationComplete'));
        console.log(I18n.t('log.originalLength', content.length.toString()));
        console.log(I18n.t('log.translatedLength', translatedContent.length.toString()));

        // 保存翻译后的文件
        await this.saveTranslatedFile(document, translatedContent);
    }

    /**
     * 估算文本的token数量
     * 粗略估算：中文字符 * 1.5 + 其他字符 / 4
     */
    private estimateTokenCount(text: string): number {
        // 统计中文字符数
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        // 统计其他字符数（去除空白字符）
        const otherChars = text.replace(/[\u4e00-\u9fff\s]/g, '').length;

        // 估算：中文字符每个约1.5 tokens，其他字符约0.25 tokens
        return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
    }

    /**
     * 将翻译后的完整文本按照原始段落结构分割
     * 尝试保持段落数量一致
     */
    private splitTranslatedText(translatedText: string, originalParagraphs: string[]): string[] {
        // 如果段落数量相同，直接按双换行符分割
        const paragraphs = translatedText.split(/\n\n+/);

        if (paragraphs.length === originalParagraphs.length) {
            return paragraphs;
        }

        // 如果数量不一致，尝试智能分割
        // 如果翻译后的段落更少，尝试按句子分割
        if (paragraphs.length < originalParagraphs.length) {
            // 尝试按句号、问号、感叹号分割
            const sentences = translatedText.split(/([.!?]\s+)/);
            const result: string[] = [];
            let currentParagraph = '';
            let sentenceIndex = 0;

            for (const original of originalParagraphs) {
                const sentenceCount = (original.match(/[.!?]/g) || []).length || 1;
                const paragraphSentences: string[] = [];

                for (let i = 0; i < sentenceCount && sentenceIndex < sentences.length; i++) {
                    paragraphSentences.push(sentences[sentenceIndex]);
                    sentenceIndex++;
                }

                result.push(paragraphSentences.join('').trim() || original);
            }

            return result.length > 0 ? result : paragraphs;
        }

        // 如果翻译后的段落更多，合并多余的段落
        if (paragraphs.length > originalParagraphs.length) {
            const result: string[] = [];
            const avgLength = Math.ceil(paragraphs.length / originalParagraphs.length);

            for (let i = 0; i < originalParagraphs.length; i++) {
                const start = i * avgLength;
                const end = Math.min(start + avgLength, paragraphs.length);
                result.push(paragraphs.slice(start, end).join('\n\n'));
            }

            return result;
        }

        return paragraphs;
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
