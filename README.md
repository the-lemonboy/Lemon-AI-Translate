# AI Translate Wiki - VSCode 插件

一个强大的 AI 翻译 VSCode 插件，专门用于将中文 Markdown 文档翻译成多种语言。

## 功能特性

- 🌍 **多语言支持**: 支持翻译成 20+种语言
- 🤖 **多种 AI 服务**: 支持 OpenAI、Azure OpenAI、Google Translate、Claude 等
- 📝 **智能 Markdown 处理**: 保持原有格式和结构
- ⚡ **批量翻译**: 高效的批量处理能力
- 🎛️ **可视化设置**: 友好的配置界面
- 🔒 **安全存储**: API 密钥安全存储在 VSCode 设置中

## 安装方法

1. 克隆此仓库到本地
2. 在 VSCode 中打开项目文件夹
3. 按 `F5` 运行插件进行测试
4. 或者使用 `vsce package` 打包成 `.vsix` 文件进行安装

## 使用方法

### 1. 配置 API 密钥

1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 输入 "AI 翻译: 打开设置"
3. 选择您的 AI 服务提供商
4. 输入 API 密钥
5. 选择目标语言
6. 保存设置

### 2. 翻译文件

**方法一：右键菜单**

- 在资源管理器中右键点击 Markdown 文件
- 选择 "AI 翻译: 翻译整个文件"

**方法二：命令面板**

- 打开要翻译的 Markdown 文件
- 按 `Ctrl+Shift+P` 打开命令面板
- 输入 "AI 翻译: 翻译整个文件"

**方法三：选中内容翻译**

- 选中要翻译的文本
- 右键选择 "AI 翻译: 翻译选中内容"

### 3. 查看翻译结果

翻译完成后，插件会：

- 在指定的输出目录创建翻译文件
- 自动打开翻译后的文件
- 文件名格式：`原文件名_语言代码.md`

## 配置选项

### API 配置

- **翻译服务提供商**: OpenAI、Azure OpenAI、Google Translate、Claude
- **API 密钥**: 您的 API 密钥
- **API 端点**: Azure OpenAI 需要配置完整端点 URL

### 翻译设置

- **目标语言**: 选择要翻译成的语言
- **输出目录**: 翻译文件的保存位置
- **保持 Markdown 格式**: 是否保持原有格式
- **翻译代码块注释**: 是否翻译代码块中的注释
- **批量翻译大小**: 每次处理的段落数量

## 支持的语言

- English (英语) - en
- Japanese (日语) - ja
- Korean (韩语) - ko
- French (法语) - fr
- German (德语) - de
- Spanish (西班牙语) - es
- Italian (意大利语) - it
- Portuguese (葡萄牙语) - pt
- Russian (俄语) - ru
- Arabic (阿拉伯语) - ar
- Thai (泰语) - th
- Vietnamese (越南语) - vi
- Hindi (印地语) - hi
- Turkish (土耳其语) - tr
- Polish (波兰语) - pl
- Dutch (荷兰语) - nl
- Swedish (瑞典语) - sv
- Danish (丹麦语) - da
- Norwegian (挪威语) - no
- Finnish (芬兰语) - fi

## 开发说明

### 项目结构

```
src/
├── extension.ts          # 主扩展文件
├── config/
│   └── configManager.ts  # 配置管理
├── services/
│   └── translationService.ts  # 翻译服务
├── processors/
│   └── markdownProcessor.ts   # Markdown处理
└── webview/
    └── settingsPanel.ts       # 设置面板
```

### 开发环境设置

1. 安装依赖：`npm install`
2. 编译代码：`npm run compile`
3. 运行测试：`npm run test`
4. 打包插件：`vsce package`

## 注意事项

1. **API 密钥安全**: 请妥善保管您的 API 密钥，不要分享给他人
2. **翻译质量**: 翻译质量取决于所选 AI 服务的性能
3. **文件格式**: 目前主要支持 Markdown 格式文件
4. **网络连接**: 需要稳定的网络连接才能使用翻译功能

## 故障排除

### 常见问题

**Q: 翻译失败，提示 API 密钥错误**
A: 请检查 API 密钥是否正确，以及是否有足够的 API 额度

**Q: 翻译结果格式混乱**
A: 请确保"保持 Markdown 格式"选项已启用

**Q: 无法连接到 API 服务**
A: 请检查网络连接和 API 端点配置

**Q: 翻译速度很慢**
A: 可以尝试调整"批量翻译大小"设置，或选择更快的 API 服务

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个插件！

## 许可证

MIT License
# Lemon-AI-Translate
# Lemon-AI-Translate
# Lemon-AI-Translate
# Lemon-AI-Translate
# Lemon-AI-Translate
