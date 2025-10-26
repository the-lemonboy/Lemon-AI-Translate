# 安装和使用指南

## 安装步骤

### 1. 开发环境安装

```bash
# 克隆项目
git clone <your-repo-url>
cd ai-translate-wiki

# 安装依赖
npm install

# 编译项目
npm run compile
```

### 2. 在 VSCode 中运行

1. 在 VSCode 中打开项目文件夹
2. 按 `F5` 键启动调试模式
3. 这会打开一个新的 VSCode 窗口，插件已加载

### 3. 打包安装

```bash
# 安装vsce工具
npm install -g vsce

# 打包插件
vsce package

# 安装生成的.vsix文件
code --install-extension ai-translate-wiki-1.0.0.vsix
```

## 配置 API 密钥

### OpenAI 配置

1. 访问 [OpenAI 官网](https://platform.openai.com/)
2. 注册账号并获取 API 密钥
3. 在插件设置中输入 API 密钥

### Azure OpenAI 配置

1. 访问 [Azure OpenAI 服务](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
2. 创建资源并获取 API 密钥和端点
3. 在插件设置中配置 API 密钥和端点 URL

### Google Translate 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 启用 Translation API
3. 创建 API 密钥
4. 在插件设置中配置 API 密钥

### Claude 配置

1. 访问 [Anthropic 官网](https://www.anthropic.com/)
2. 注册账号并获取 API 密钥
3. 在插件设置中配置 API 密钥

## 使用方法

### 1. 打开设置面板

- 按 `Ctrl+Shift+P` 打开命令面板
- 输入 "AI 翻译: 打开设置"
- 配置 API 密钥和目标语言

### 2. 翻译整个文件

- 在资源管理器中右键点击 Markdown 文件
- 选择 "AI 翻译: 翻译整个文件"
- 或使用命令面板执行相同操作

### 3. 翻译选中内容

- 选中要翻译的文本
- 右键选择 "AI 翻译: 翻译选中内容"

## 测试插件

1. 打开 `example.md` 文件
2. 右键选择 "AI 翻译: 翻译整个文件"
3. 查看生成的翻译文件

## 故障排除

### 常见问题

**编译错误**

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run compile
```

**API 连接失败**

- 检查网络连接
- 验证 API 密钥是否正确
- 确认 API 服务是否可用

**翻译质量不佳**

- 尝试不同的 AI 服务提供商
- 调整批量翻译大小
- 检查原文格式是否正确

## 开发调试

### 调试模式

1. 在 VSCode 中打开项目
2. 按 `F5` 启动调试
3. 在调试控制台中查看日志

### 日志查看

- 打开 "帮助" > "切换开发者工具"
- 在控制台中查看详细日志

### 代码修改

1. 修改源代码
2. 按 `Ctrl+Shift+P` 选择 "Developer: Reload Window"
3. 重新测试功能
