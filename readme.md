# AI提效 - 智能任务管理与效率提升工具

<div align="center">

![AI提效](public/icons/icon-192x192.png)

**基于 Next.js 15 + Electron 35 构建的现代化桌面应用**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](package.json)

</div>

## 📖 项目简介

AI提效是一款集成了人工智能的任务管理与效率提升工具，采用艾森豪威尔矩阵方法论，帮助用户科学地管理任务优先级，提升工作和生活效率。应用结合了现代化的桌面应用体验和强大的AI分析能力，为用户提供智能化的任务规划建议。

### 🎯 核心特性

- **🧠 AI智能分析**：集成Moonshot AI，提供任务分析和执行计划建议
- **📊 艾森豪威尔矩阵**：科学的四象限任务分类管理
- **📅 智能日历**：可视化任务时间管理和提醒
- **📝 富文本笔记**：支持Markdown的高级笔记编辑器
- **🔄 实时同步**：基于Supabase的云端数据同步
- **🎨 现代化UI**：基于shadcn/ui的精美界面设计
- **📱 跨平台支持**：Windows、macOS、Linux桌面应用
- **🔒 安全认证**：完整的用户认证和数据安全保护

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 15 (App Router)
- **UI库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS 3.4
- **状态管理**: React Hooks + Context
- **图标**: Lucide React
- **富文本编辑**: TipTap + AIEditor
- **拖拽排序**: @dnd-kit
- **日期处理**: date-fns
- **图表**: Recharts

### 后端技术栈
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **API**: Next.js API Routes
- **AI服务**: Moonshot AI (Kimi)
- **实时同步**: Supabase Realtime

### 桌面应用
- **框架**: Electron 35
- **构建工具**: electron-builder
- **进程通信**: IPC (Inter-Process Communication)
- **系统集成**: 系统托盘、通知、窗口管理

### 开发工具
- **语言**: TypeScript 5.8
- **包管理**: pnpm
- **代码规范**: ESLint + Prettier
- **构建优化**: Webpack 5 + SWC

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/ai-efficiency-tool.git
cd ai-efficiency-tool
```

2. **安装依赖**
```bash
pnpm install
```

3. **环境配置**
```bash
# 复制环境变量模板
cp .env.example .env.local

# 配置必要的环境变量
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MOONSHOT_API_KEY=your_moonshot_api_key
```

4. **数据库设置**
```bash
# 在Supabase中执行SQL脚本
# sql/setup-supabase.sql
# sql/subtasks-table.sql
```

5. **启动开发服务器**
```bash
# Web开发模式
pnpm dev

# Electron开发模式
pnpm start:electron
```

6. **容器启动**

```bash
# 构建并启动
sudo docker-compose build && sudo docker-compose up -d
```

## 📁 项目结构

```
ai-efficiency-tool/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 认证相关页面
│   ├── api/                      # API路由
│   │   └── analyze-task/         # AI任务分析接口
│   ├── dashboard/                # 主应用界面
│   │   ├── calendar/             # 日历页面
│   │   ├── notes/                # 笔记页面
│   │   ├── stats/                # 统计页面
│   │   └── components/           # 页面组件
│   ├── login/                    # 登录页面
│   ├── register/                 # 注册页面
│   └── layout.tsx                # 根布局
├── components/                   # 共享组件
│   ├── ui/                       # shadcn/ui组件
│   ├── Calendar.tsx              # 日历组件
│   ├── TaskEditModal.tsx         # 任务编辑弹窗
│   ├── RichTextEditor.tsx        # 富文本编辑器
│   └── sidebar.tsx               # 侧边栏
├── lib/                          # 工具库
│   ├── supabase/                 # Supabase客户端
│   ├── auth.ts                   # 认证工具
│   ├── tasks.ts                  # 任务管理
│   ├── notes.ts                  # 笔记管理
│   └── utils.ts                  # 通用工具
├── sql/                          # 数据库脚本
│   ├── setup-supabase.sql        # 数据库初始化
│   └── subtasks-table.sql        # 子任务表
├── scripts/                      # 构建脚本
│   ├── clean-cache.js            # 缓存清理
│   ├── dependency-optimizer.js   # 依赖优化
│   ├── optimize-build.js         # 构建优化
│   └── remove-debug-logs.js      # 调试日志清理
├── public/                       # 静态资源
│   ├── icons/                    # 应用图标
│   └── manifest.json             # PWA配置
├── preload/                      # Electron预加载脚本
├── main.js                       # Electron主进程
├── electron-builder.yml          # 打包配置
├── next.config.ts                # Next.js配置
├── tailwind.config.ts            # Tailwind配置
└── package.json                  # 项目配置
```

## 🎯 核心功能模块

### 1. 任务管理系统
- **艾森豪威尔矩阵**: 四象限任务分类（重要紧急、重要不紧急、不重要紧急、不重要不紧急）
- **任务CRUD**: 创建、读取、更新、删除任务
- **子任务支持**: 任务分解和进度跟踪
- **标签系统**: 灵活的任务分类和筛选
- **截止日期**: 时间管理和提醒功能
- **拖拽排序**: 直观的任务优先级调整

### 2. AI智能分析
- **任务分析**: 基于Moonshot AI的任务分解建议
- **执行计划**: 自动生成详细的任务执行步骤
- **风险评估**: 识别潜在风险和解决方案
- **时间估算**: 智能的时间规划建议
- **流式输出**: 实时显示AI分析结果

### 3. 日历视图
- **月视图**: 直观的月度任务概览
- **日视图**: 详细的单日任务安排
- **任务标记**: 不同象限任务的颜色区分
- **快速编辑**: 日历中直接编辑任务
- **时间导航**: 便捷的日期切换

### 4. 笔记系统
- **富文本编辑**: 支持Markdown语法的高级编辑器
- **实时保存**: 自动保存编辑内容
- **搜索功能**: 全文搜索笔记内容
- **分类管理**: 笔记分类和标签
- **导入导出**: 支持多种格式的导入导出

### 5. 数据统计
- **任务完成率**: 可视化的完成情况统计
- **时间分布**: 各象限任务时间分析
- **趋势图表**: 效率提升趋势展示
- **个人报告**: 定期的效率分析报告

## 🗄️ 数据库设计

### 核心表结构

#### profiles (用户资料)
```sql
- id: UUID (主键, 关联auth.users)
- name: TEXT (用户姓名)
- email: TEXT (邮箱地址)
- created_at: TIMESTAMP (创建时间)
```

#### tasks (任务表)
```sql
- id: UUID (主键)
- user_id: UUID (用户ID)
- title: TEXT (任务标题)
- quadrant: SMALLINT (象限: 1-4)
- due_date: DATE (截止日期)
- tags: TEXT[] (标签数组)
- notes: TEXT (任务备注)
- completed: BOOLEAN (完成状态)
- created_at: TIMESTAMP (创建时间)
```

#### subtasks (子任务表)
```sql
- id: UUID (主键)
- task_id: UUID (父任务ID)
- title: TEXT (子任务标题)
- completed: BOOLEAN (完成状态)
- created_at: TIMESTAMP (创建时间)
```

#### notes (笔记表)
```sql
- id: UUID (主键)
- user_id: UUID (用户ID)
- title: TEXT (笔记标题)
- content: TEXT (笔记内容)
- created_at: TIMESTAMP (创建时间)
- updated_at: TIMESTAMP (更新时间)
```

#### tags (标签表)
```sql
- id: UUID (主键)
- user_id: UUID (用户ID)
- name: TEXT (标签名称)
```

### 安全策略 (RLS)
- 所有表启用行级安全策略
- 用户只能访问自己的数据
- 基于 `auth.uid()` 的权限控制

## 🔧 开发指南

### 可用脚本

```bash
# 开发相关
pnpm dev                    # 启动Web开发服务器
pnpm start:electron         # 启动Electron开发模式
pnpm debug                  # 启动调试模式

# 构建相关
pnpm build                  # 构建Next.js应用
pnpm build:next             # 仅构建Next.js
pnpm build:electron         # 构建Electron应用
pnpm build:all              # 完整构建流程

# 工具脚本
node scripts/clean-cache.js           # 清理构建缓存
node scripts/dependency-optimizer.js  # 优化依赖
node scripts/optimize-build.js        # 构建优化
node scripts/remove-debug-logs.js     # 清理调试日志
```

### 代码规范

1. **TypeScript**: 严格的类型检查
2. **ESLint**: 代码质量检查
3. **Prettier**: 代码格式化
4. **组件命名**: PascalCase
5. **文件命名**: kebab-case
6. **提交规范**: Conventional Commits

### 开发流程

1. **功能开发**
   - 创建功能分支
   - 编写组件和逻辑
   - 添加类型定义
   - 编写测试用例

2. **数据库操作**
   - 使用 `lib/` 下的工具函数
   - 遵循 RLS 安全策略
   - 处理错误情况

3. **UI组件**
   - 基于 shadcn/ui 组件
   - 响应式设计
   - 主题适配

4. **状态管理**
   - React Hooks
   - Context API
   - 本地状态优先

## 📦 构建与部署

### 开发环境构建
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动Electron开发模式
pnpm start:electron
```

### 生产环境构建
```bash
# 完整构建流程
pnpm build:all

# 仅构建Web应用
pnpm build:next

# 仅构建Electron应用
pnpm build:electron
```

### 构建优化

#### 1. 缓存优化
- Webpack构建缓存
- Electron下载缓存
- 依赖安装缓存

#### 2. 体积优化
- Tree Shaking
- 代码分割
- 资源压缩
- 依赖去重

#### 3. 速度优化
- 并行构建
- 增量编译
- 预编译资源

### 打包配置 (electron-builder.yml)
```yaml
appId: com.ai.efficiency
productName: AI提效
directories:
  output: dist
win:
  target: nsis
  icon: "./public/icons/icon.ico"
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

## 🔐 环境变量配置

### 必需环境变量
```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI服务配置
MOONSHOT_API_KEY=your_moonshot_api_key

# 应用配置
NODE_ENV=development|production
```

### 可选环境变量
```bash
# 调试配置
ELECTRON_DISABLE_SECURITY_WARNINGS=true
ELECTRON_ENABLE_LOGGING=true

# 构建配置
ELECTRON_CACHE=./electron-cache
```

## 🚀 部署指南

### 1. Web应用部署 (Vercel)
```bash
# 连接Vercel
vercel

# 配置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add MOONSHOT_API_KEY

# 部署
vercel --prod
```

### 2. 桌面应用分发
```bash
# 构建安装包
pnpm build:electron

# 生成的文件位置
dist/AI提效安装程序.exe  # Windows安装包
dist/win-unpacked/       # Windows便携版
```

### 3. 自动更新配置
- 配置更新服务器
- 设置版本检查
- 实现增量更新

## 🧪 测试

### 单元测试
```bash
# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

### E2E测试
```bash
# Electron应用测试
pnpm test:e2e
```

### 手动测试清单
- [ ] 用户注册/登录
- [ ] 任务CRUD操作
- [ ] AI分析功能
- [ ] 日历视图
- [ ] 笔记编辑
- [ ] 数据同步
- [ ] 离线功能
- [ ] 系统集成

## 🔧 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存
node scripts/clean-cache.js

# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 检查Node.js版本
node --version  # 需要 >= 18.0.0
```

#### 2. Electron启动失败
```bash
# 检查主进程文件
pnpm convert:main

# 检查预加载脚本
ls preload/preload.js

# 查看错误日志
pnpm start:electron --enable-logging
```

#### 3. 数据库连接问题
- 检查Supabase URL和密钥
- 验证网络连接
- 确认RLS策略配置

#### 4. AI功能异常
- 验证Moonshot API密钥
- 检查API配额
- 查看网络请求日志

### 性能优化

#### 1. 应用启动速度
- 减少预加载资源
- 优化主进程代码
- 使用代码分割

#### 2. 内存使用
- 及时清理事件监听器
- 优化图片资源
- 避免内存泄漏

#### 3. 网络请求
- 实现请求缓存
- 使用防抖处理
- 优化API调用

## 📚 参考资料

### 官方文档
- [Next.js 15 文档](https://nextjs.org/docs)
- [Electron 文档](https://www.electronjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)

### 相关技术
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)
- [React 18](https://react.dev/learn)
- [Moonshot AI](https://platform.moonshot.cn/docs)

### 设计参考
- [艾森豪威尔矩阵](https://zh.wikipedia.org/wiki/艾森豪威尔矩阵)
- [Material Design](https://material.io/design)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)



## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **开发者**: CXCH
- **邮箱**: 707495862@qq.com
- **项目地址**: [GitHub Repository](https://github.com/your-username/ai-efficiency-tool)

## 🙏 致谢

感谢以下开源项目和服务：
- [Next.js](https://nextjs.org) - React框架
- [Electron](https://electronjs.org) - 跨平台桌面应用框架
- [Supabase](https://supabase.com) - 开源Firebase替代方案
- [shadcn/ui](https://ui.shadcn.com) - 现代化UI组件库
- [Tailwind CSS](https://tailwindcss.com) - 实用优先的CSS框架
- [Moonshot AI](https://platform.moonshot.cn) - AI服务提供商

---

<div align="center">

**如果这个项目对您有帮助，请给它一个 ⭐️**

[报告Bug](https://github.com/your-username/ai-efficiency-tool/issues) · [请求功能](https://github.com/your-username/ai-efficiency-tool/issues) · [贡献代码](https://github.com/your-username/ai-efficiency-tool/pulls)

</div>