#!/usr/bin/env node

/**
 * AI翻译插件测试脚本
 * 用于验证插件的基本功能
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI翻译插件测试脚本');
console.log('========================\n');

// 检查项目结构
function checkProjectStructure() {
    console.log('📁 检查项目结构...');
    
    const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'src/extension.ts',
        'src/config/configManager.ts',
        'src/services/translationService.ts',
        'src/processors/markdownProcessor.ts',
        'src/webview/settingsPanel.ts',
        'out/extension.js'
    ];
    
    const missingFiles = [];
    
    requiredFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length === 0) {
        console.log('✅ 项目结构完整');
    } else {
        console.log('❌ 缺少以下文件:');
        missingFiles.forEach(file => console.log(`   - ${file}`));
    }
    
    return missingFiles.length === 0;
}

// 检查package.json配置
function checkPackageJson() {
    console.log('\n📦 检查package.json配置...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        const requiredFields = ['name', 'displayName', 'version', 'main', 'contributes'];
        const missingFields = requiredFields.filter(field => !packageJson[field]);
        
        if (missingFields.length === 0) {
            console.log('✅ package.json配置正确');
            console.log(`   插件名称: ${packageJson.displayName}`);
            console.log(`   版本: ${packageJson.version}`);
            console.log(`   主文件: ${packageJson.main}`);
        } else {
            console.log('❌ package.json缺少以下字段:');
            missingFields.forEach(field => console.log(`   - ${field}`));
        }
        
        return missingFields.length === 0;
    } catch (error) {
        console.log('❌ package.json解析失败:', error.message);
        return false;
    }
}

// 检查编译输出
function checkCompiledOutput() {
    console.log('\n🔨 检查编译输出...');
    
    const outDir = 'out';
    if (!fs.existsSync(outDir)) {
        console.log('❌ out目录不存在，请先运行 npm run compile');
        return false;
    }
    
    const compiledFiles = fs.readdirSync(outDir);
    if (compiledFiles.length === 0) {
        console.log('❌ out目录为空，请检查编译过程');
        return false;
    }
    
    console.log('✅ 编译输出正常');
    console.log(`   编译文件数量: ${compiledFiles.length}`);
    compiledFiles.forEach(file => console.log(`   - ${file}`));
    
    return true;
}

// 检查示例文件
function checkExampleFile() {
    console.log('\n📄 检查示例文件...');
    
    if (!fs.existsSync('example.md')) {
        console.log('❌ 示例文件不存在');
        return false;
    }
    
    const content = fs.readFileSync('example.md', 'utf8');
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    
    if (chineseChars > 0) {
        console.log('✅ 示例文件包含中文内容');
        console.log(`   中文字符数量: ${chineseChars}`);
    } else {
        console.log('⚠️  示例文件不包含中文内容');
    }
    
    return true;
}

// 生成测试报告
function generateTestReport(results) {
    console.log('\n📊 测试报告');
    console.log('============');
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`总测试项: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${total - passed}`);
    console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
        console.log('\n🎉 所有测试通过！插件已准备好进行手动测试。');
        console.log('\n📋 下一步操作:');
        console.log('1. 在VSCode中按 F5 启动调试模式');
        console.log('2. 在新窗口中配置API设置');
        console.log('3. 测试翻译功能');
    } else {
        console.log('\n⚠️  部分测试失败，请检查上述问题后重新运行测试。');
    }
}

// 主测试函数
function runTests() {
    const results = [
        checkProjectStructure(),
        checkPackageJson(),
        checkCompiledOutput(),
        checkExampleFile()
    ];
    
    generateTestReport(results);
}

// 运行测试
runTests();
