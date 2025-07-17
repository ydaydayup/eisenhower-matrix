# AI提效工具应用

基于 Next.js 和 Electron 构建的高效率AI工具应用

## 最新更新

### 2023版本更新内容

1. **修复弹窗配置问题**：
   - 优化应用弹窗显示逻辑
   - 修复了弹窗位置和尺寸问题
   - 改进弹窗交互体验

2. **优化安装速度**：
   - 减少应用的安装时间，从10分钟缩短到1-2分钟
   - 改进NSIS安装脚本，提升安装效率
   - 优化资源加载和解压速度

3. **更新随手记页面**：
   - 全新UI设计，改善用户体验
   - 增强备忘录的搜索和过滤功能
   - 优化备忘录编辑和预览功能

4. **增加自定义安装路径功能**：
   - 支持用户选择自定义安装目录
   - 优化安装流程，提供更多安装选项
   - 安装前自动检查磁盘空间

## 优化安装时间

为了减少应用的安装时间，我们进行了以下优化：

### 快速构建脚本

使用以下命令进行优化构建：

```bash
#https://gitlab.winehq.org/wine/wine/-/wikis/Debian-Ubuntu
#https://www.electron.build/multi-platform-build#to-build-app-for-windows-on-linux
sudo apt-get update
sudo apt-get install --no-install-recommends -y winehq-stable

# 快速构建（使用缓存和优化配置）
pnpm build:quick

# 超快速构建（包含依赖优化）
pnpm build:super-fast

# 最大速度构建（全方位优化）
pnpm build:max-speed

# 标准构建命令（推荐用于生产环境）
pnpm build:all
```

### 优化内容

1. **构建优化**：
   - 减少压缩级别，加快构建和安装
   - 使用asar打包，提高安装效率
   - 使用缓存加速构建过程

2. **依赖优化**：
   - 减少不必要的依赖文件
   - 合并重复依赖
   - 排除开发相关文件

3. **安装优化**：
   - 优化NSIS安装脚本
   - 减少文件IO操作
   - 改善用户安装体验
   - 支持自定义安装路径

使用优化方案后，应用安装时间预计可从10分钟减少到1-2分钟左右。

## 开发参考

登录参考: https://supabase.com/docs/guides/auth/server-side/nextjs

## 关于备份文件夹

`.debug-logs-backup` 是项目的备份文件夹，包含了整个 Next.js 项目的文件结构。是用来存储项目的调试日志备份或者是在调试过程中创建的项目副本。
文件夹中包含了典型的 Next.js 项目结构，如 app 目录、components 目录、next.config.ts、tailwind.config.ts 等关键文件。