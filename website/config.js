// 网站配置文件
const websiteConfig = {
    // 应用信息
    app: {
        name: 'AI提效',
        version: '1.0.0',
        description: '基于艾森豪威尔矩阵的智能任务管理工具',
        author: 'CXCH',
        email: '707495862@qq.com'
    },
    
    // 下载链接配置
    downloads: {
        windows: {
            url: '../dist/AI提效安装程序.exe', // 实际的Windows安装包路径
            size: '150MB',
            requirements: 'Windows 10 (1903) 或更高版本'
        },
        macos: {
            url: '../dist/AI提效-1.0.0.dmg', // 实际的macOS安装包路径
            size: '140MB',
            requirements: 'macOS 10.15 (Catalina) 或更高版本'
        },
        linux: {
            url: '../dist/AI提效-1.0.0.AppImage', // 实际的Linux安装包路径
            size: '145MB',
            requirements: 'Ubuntu 18.04+ / Debian 10+ 或同等发行版'
        }
    },
    
    // 功能特性配置
    features: [
        {
            icon: '🧠',
            title: 'AI智能分析',
            description: '基于Moonshot AI的任务分析，自动生成执行计划、风险评估和时间建议，让任务规划更科学'
        },
        {
            icon: '📊',
            title: '艾森豪威尔矩阵',
            description: '科学的四象限任务分类法，帮您区分重要紧急程度，优化时间分配，提升工作效率'
        },
        {
            icon: '📅',
            title: '智能日历',
            description: '可视化的任务时间管理，支持月视图和日视图，直观展示任务分布，合理安排时间'
        },
        {
            icon: '📝',
            title: '富文本笔记',
            description: '支持Markdown语法的高级编辑器，实时保存，全文搜索，让知识管理更高效'
        },
        {
            icon: '🔄',
            title: '云端同步',
            description: '基于Supabase的实时数据同步，多设备无缝切换，数据安全可靠'
        },
        {
            icon: '📈',
            title: '数据统计',
            description: '可视化的效率分析报告，任务完成率统计，帮您持续优化工作方式'
        },
        {
            icon: '⏰',
            title: '系统定时通知提醒',
            description: '智能的任务提醒系统，支持自定义提醒时间，确保重要任务不被遗忘，提升执行效率'
        },
        {
            icon: '📌',
            title: '桌面置顶功能',
            description: '一键置顶应用窗口，始终保持在桌面最前端，方便随时查看和管理任务，提升工作专注度'
        }
    ],
    
    // 技术栈配置
    technologies: [
        {
            icon: '⚡',
            name: 'Next.js 15',
            description: '最新的React框架，提供极致的性能和开发体验'
        },
        {
            icon: '🖥️',
            name: 'Electron 35',
            description: '跨平台桌面应用框架，原生体验'
        },
        {
            icon: '🗄️',
            name: 'Supabase',
            description: '现代化的后端即服务，安全可靠的数据存储'
        },
        {
            icon: '🎨',
            name: 'Tailwind CSS',
            description: '现代化的CSS框架，精美的界面设计'
        }
    ],
    
    // 社交媒体链接
    social: {
        github: 'https://github.com/your-username/ai-efficiency-tool',
        email: 'mailto:707495862@qq.com',
        website: 'https://your-website.com'
    },
    
    // 统计配置
    analytics: {
        googleAnalytics: 'G-XXXXXXXXXX', // 替换为实际的GA ID
        enabled: false // 开发环境关闭统计
    },
    
    // API配置
    api: {
        baseUrl: 'https://api.your-domain.com',
        endpoints: {
            download: '/api/download',
            feedback: '/api/feedback',
            stats: '/api/stats'
        }
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = websiteConfig;
} else {
    window.websiteConfig = websiteConfig;
}
