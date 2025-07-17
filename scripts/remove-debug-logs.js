#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 备份目录
const BACKUP_DIR = path.join(__dirname, '../.debug-logs-backup');

// 定义需要保留的错误日志（这些对程序运行至关重要）
const ESSENTIAL_ERRORS = [
  // 网络连接状态相关的错误日志（影响功能）
  'console.error(\'网络连接已断开，无法发送请求到Supabase\')',
  'console.warn(\'网络连接已断开，Supabase操作将会失败，请检查您的网络连接\')',
];

// 定义不同类型的调试打印正则表达式，更精确的匹配
const DEBUG_PATTERNS = [
  // 常规日志 - 匹配console.log开头到分号或行尾
  /console\.log\s*\([\s\S]*?\);?/g,
  // 调试日志
  /console\.debug\s*\([\s\S]*?\);?/g,
  // 信息日志
  /console\.info\s*\([\s\S]*?\);?/g,
  // 警告日志
  /console\.warn\s*\([\s\S]*?\);?/g,
  // 错误日志
  /console\.error\s*\([\s\S]*?\);?/g,
  // 其他调试方法
  /console\.trace\s*\([\s\S]*?\);?/g,
  /console\.dir\s*\([\s\S]*?\);?/g,
  /console\.table\s*\([\s\S]*?\);?/g,
  // 注释掉的调试代码 - 匹配整行注释
  /\/\/.*console\.[a-z]+\s*\([\s\S]*?\);?.*$/gm,
  // 调试器语句
  /debugger;?/g,
  // 警告弹窗
  /alert\s*\([\s\S]*?\);?/g,
];

// 需要忽略的目录
const IGNORE_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.debug-logs-backup',
];

// 需要忽略的文件
const IGNORE_FILES = [
  'remove-debug-logs.js', // 忽略当前脚本
  'workbox-c05e7c83.js',  // 忽略第三方库文件
];

// 创建备份目录
function createBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`创建备份目录: ${BACKUP_DIR}`);
    } catch (err) {
      console.error(`创建备份目录失败: ${err.message}`);
      process.exit(1);
    }
  }
}

// 备份文件
function backupFile(filePath) {
  const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  
  // 确保备份目录存在
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    fs.copyFileSync(filePath, backupPath);
    return true;
  } catch (err) {
    console.error(`备份文件 ${filePath} 失败:`, err);
    return false;
  }
}

// 处理文件的函数
function processFile(filePath) {
  // 检查文件扩展名
  const ext = path.extname(filePath).toLowerCase();
  if (!['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs'].includes(ext)) {
    return;
  }

  // 读取文件内容
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`无法读取文件 ${filePath}:`, err);
    return;
  }

  // 原始内容的备份
  const originalContent = content;

  // 保留必要的错误日志
  let preservedLogs = [];
  ESSENTIAL_ERRORS.forEach(errorPattern => {
    if (content.includes(errorPattern)) {
      preservedLogs.push(errorPattern);
    }
  });

  // 应用所有正则表达式模式
  DEBUG_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, match => {
      // 检查是否是需要保留的日志
      for (const preserved of preservedLogs) {
        if (match.includes(preserved)) {
          return match; // 保留这个日志
        }
      }
      return ''; // 删除这个日志
    });
  });

  // 清理可能留下的空行
  content = content.replace(/^\s*[\r\n]/gm, '');
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 如果内容有变化，先备份再写回文件
  if (content !== originalContent) {
    // 备份原始文件
    if (backupFile(filePath)) {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`已处理: ${filePath}`);
      } catch (err) {
        console.error(`无法写入文件 ${filePath}:`, err);
      }
    }
  }
}

// 递归遍历目录
function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    // 忽略特定目录
    if (IGNORE_DIRS.includes(file)) {
      continue;
    }
    
    const fullPath = path.join(dir, file);
    
    // 忽略特定文件
    if (IGNORE_FILES.includes(file)) {
      continue;
    }
    
    try {
      // 检查是否是目录
      if (fs.statSync(fullPath).isDirectory()) {
        traverseDirectory(fullPath);
      } else {
        processFile(fullPath);
      }
    } catch (err) {
      console.error(`处理 ${fullPath} 时出错:`, err);
    }
  }
}

// 主函数
function main() {
  console.log('开始删除调试打印信息...');
  
  // 创建备份目录
  createBackupDir();
  
  // 获取项目根目录
  const rootDir = path.resolve(__dirname, '..');
  
  // 遍历项目目录
  traverseDirectory(rootDir);
  
  console.log(`调试打印信息删除完成！原始文件已备份到 ${BACKUP_DIR}`);
}

// 执行主函数
main(); 