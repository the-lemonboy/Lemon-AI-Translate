# 🚀 快速开始测试插件

## 方法 1：使用 VSCode 调试模式（推荐）

### 步骤 1：编译项目

```bash
# 在终端中运行
cd /Users/lemon/Desktop/lemon-\ translate
npm run compile
```

### 步骤 2：启动调试模式

1. 在 VSCode 中打开项目文件夹
2. 按 `F5` 键或点击"运行和调试"面板
3. 选择"运行扩展"
4. 等待新的 VSCode 窗口打开（扩展开发主机）

### 步骤 3：测试插件功能

1. 在新窗口中按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）
2. 输入 "AI 翻译" 查看所有可用命令
3. 选择 "AI 翻译: 打开设置" 配置 API
4. 打开 `example.md` 文件测试翻译功能

## 方法 2：使用命令行测试

### 快速测试脚本

```bash
# 运行自动测试
node test-plugin.js

# 编译项目
npm run compile

# 检查编译结果
ls -la out/
```

### 手动验证

```bash
# 检查主要文件是否存在
ls -la out/extension.js
ls -la out/config/
ls -la out/services/
ls -la out/processors/
ls -la out/webview/
```

## 方法 3：打包安装测试

### 打包插件

```bash
# 安装打包工具
npm install -g vsce

# 打包插件
vsce package

# 安装插件
code --install-extension ai-translate-wiki-1.0.0.vsix
```

## 🔧 故障排除

### 问题 1：编译失败

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### 问题 2：找不到任务

- 确保在正确的项目目录中
- 手动运行 `npm run compile`
- 检查 `package.json` 中的 scripts 配置

### 问题 3：插件未激活

- 确保在扩展开发主机窗口中测试
- 检查 `out/extension.js` 文件是否存在
- 重新编译项目

### 问题 4：API 连接失败

- 检查 API 密钥是否正确
- 验证网络连接
- 查看 VSCode 开发者工具中的错误信息

## 📋 测试检查清单

### 基础功能

- [ ] 项目编译成功
- [ ] 调试模式启动正常
- [ ] 插件在新窗口中激活
- [ ] 命令面板显示翻译命令

### 翻译功能

- [ ] 设置面板能够打开
- [ ] API 配置能够保存
- [ ] 文件翻译功能正常
- [ ] 选中内容翻译正常
- [ ] 翻译结果格式正确

### 配置功能

- [ ] 能够切换 API 服务
- [ ] 能够修改目标语言
- [ ] 设置能够持久化保存
- [ ] 错误处理正常

## 🎯 快速验证命令

```bash
# 一键测试脚本
echo "🚀 开始测试AI翻译插件..."
npm run compile && echo "✅ 编译成功" || echo "❌ 编译失败"
node test-plugin.js
echo "📋 请按照上述步骤在VSCode中测试插件功能"
```

## 💡 提示

1. **首次测试**：建议先使用调试模式，这样可以看到详细的错误信息
2. **API 配置**：测试前需要先配置有效的 API 密钥
3. **文件格式**：确保测试文件是有效的 Markdown 格式
4. **网络连接**：确保网络连接正常，API 服务可访问

现在你可以按照上述步骤开始测试插件了！
