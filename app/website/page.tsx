"use client"
import React, { useState } from "react"

export default function WebsitePage() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [showToast, setShowToast] = useState(false)

  const openContactModal = () => {
    setIsContactModalOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeContactModal = () => {
    setIsContactModalOpen(false)
    document.body.style.overflow = ''
  }

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToastMessage(successMessage)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setToastMessage(successMessage)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const copyQQNumber = () => {
    copyToClipboard('1057464388', '群号已复制到剪贴板')
  }

  const copyEmail = () => {
    copyToClipboard('707495862@qq.com', '邮箱已复制到剪贴板')
  }

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isContactModalOpen) {
        closeContactModal()
      }
    }

    if (isContactModalOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isContactModalOpen])

  return (
    <>
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-black/10 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-5 flex justify-between items-center h-[70px]">
          <div className="flex items-center text-2xl font-bold text-blue-600">
            <img src="/icons/icon-192x192.png" alt="AI提效" className="w-10 h-10 mr-2" />
            AI提效
          </div>
          <ul className="hidden md:flex gap-8 font-medium">
            <li><a href="#features" className="hover:text-blue-600 transition">功能特性</a></li>
            <li><a href="#download" className="hover:text-blue-600 transition">下载</a></li>
          </ul>
          <a href="#download" className="bg-gradient-to-tr from-blue-600 to-blue-400 text-white py-3 px-6 rounded-full font-semibold shadow hover:-translate-y-1 hover:shadow-lg transition-all">立即下载</a>
        </div>
      </nav>
      {/* Hero 区域 */}
      <section className="bg-gradient-to-tr from-indigo-400 to-purple-600 text-white pt-32 pb-20 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-5 relative z-10">
          <h1 className="text-5xl font-bold mb-5 bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">AI提效</h1>
          <p className="text-xl mb-10 opacity-90">基于艾森豪威尔矩阵的智能任务管理工具<br />让AI助您科学规划，高效执行</p>
          <div className="flex flex-wrap justify-center gap-5">
            <a href="#download" className="bg-white text-blue-600 py-4 px-8 rounded-full font-bold text-lg shadow hover:-translate-y-1 hover:shadow-xl transition-all flex items-center gap-2"><span>🚀</span>免费使用</a>
            <a href="#features" className="border-2 border-white py-4 px-8 rounded-full font-bold text-lg hover:bg-white hover:text-blue-600 transition-all">了解更多</a>
          </div>
        </div>
      </section>
      {/* Features 区域 */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">强大功能，助力高效</h2>
            <p className="text-lg text-slate-500">集成人工智能的任务管理系统，让每一分钟都更有价值</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">AI智能分析</h3>
              <p className="text-slate-500">基于Moonshot AI的任务分析，自动生成执行计划、风险评估和时间建议，让任务规划更科学</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">艾森豪威尔矩阵</h3>
              <p className="text-slate-500">科学的四象限任务分类法，帮您区分重要紧急程度，优化时间分配，提升工作效率</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">智能日历</h3>
              <p className="text-slate-500">可视化的任务时间管理，支持月视图和日视图，直观展示任务分布，合理安排时间</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">富文本笔记</h3>
              <p className="text-slate-500">支持Markdown语法的高级编辑器，实时保存，全文搜索，让知识管理更高效</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">云端同步</h3>
              <p className="text-slate-500">实时数据同步，多设备无缝切换，数据安全可靠</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">数据统计</h3>
              <p className="text-slate-500">可视化的效率分析报告，任务完成率统计，帮您持续优化工作方式</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">系统定时通知提醒</h3>
              <p className="text-slate-500">智能的任务提醒系统，支持自定义提醒时间，确保重要任务不被遗忘，提升执行效率</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:-translate-y-2 hover:shadow-2xl transition-all flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-3xl mb-4">📌</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">桌面置顶功能</h3>
              <p className="text-slate-500">一键置顶应用窗口，始终保持在桌面最前端，方便随时查看和管理任务，提升工作专注度</p>
            </div>
          </div>
        </div>
      </section>
      {/* 产品截图区域 */}
      <section id="screenshots" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">产品界面预览</h2>
            <p className="text-lg text-slate-500">简洁美观的界面设计，带来极致的使用体验</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div className="rounded-xl overflow-hidden shadow-lg bg-white hover:-translate-y-2 hover:shadow-2xl transition-all">
              <img src="/screenshots/dashboard.png" alt="AI提效主界面 - 艾森豪威尔矩阵视图" className="w-full h-64 object-cover" loading="lazy" />
              <div className="p-6 text-center bg-white">
                <h4 className="text-xl font-semibold text-slate-800 mb-2">🏠 主界面</h4>
                <p className="text-slate-500">艾森豪威尔矩阵视图</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg bg-white hover:-translate-y-2 hover:shadow-2xl transition-all">
              <img src="/screenshots/calendar.png" alt="AI提效日历视图 - 时间管理界面" className="w-full h-64 object-cover" loading="lazy" />
              <div className="p-6 text-center bg-white">
                <h4 className="text-xl font-semibold text-slate-800 mb-2">📅 日历视图</h4>
                <p className="text-slate-500">时间管理一目了然</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg bg-white hover:-translate-y-2 hover:shadow-2xl transition-all">
              <img src="/screenshots/ai-analysis.png" alt="AI提效智能分析 - AI任务规划" className="w-full h-64 object-cover" loading="lazy" />
              <div className="p-6 text-center bg-white">
                <h4 className="text-xl font-semibold text-slate-800 mb-2">🤖 AI分析</h4>
                <p className="text-slate-500">智能任务规划建议</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 下载区域 */}
      <section id="download" className="py-24 bg-gradient-to-tr from-slate-800 to-slate-700 text-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">立即下载 AI提效</h2>
            <p className="text-lg opacity-90 mb-10">支持 Windows、macOS、Linux 多平台</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Web 在线版 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8 text-center shadow-lg hover:-translate-y-2 hover:bg-white/20 transition-all flex flex-col items-center">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold mb-2">Web 在线版</h3>
              <p className="mb-4">无需下载，立即使用</p>
              <a href="https://www.dbsx.site/login" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow hover:-translate-y-1 hover:shadow-xl transition-all mb-3">
                <span>🚀</span> 立即使用
              </a>
              <div className="text-xs opacity-70">支持所有现代浏览器</div>
            </div>
            {/* Windows */}
            <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8 text-center shadow-lg hover:-translate-y-2 hover:bg-white/20 transition-all flex flex-col items-center">
              <div className="text-4xl mb-4">🪟</div>
              <h3 className="text-xl font-semibold mb-2">Windows</h3>
              <p className="mb-4">支持 Windows 10/11</p>
              <a href="https://share.weiyun.com/BdvButcJ" className="inline-flex items-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow hover:-translate-y-1 hover:shadow-xl transition-all mb-3">
                <span>📥</span> 下载 Windows 版
              </a>
              <div className="text-xs opacity-70">版本 1.0.0 | 约 150MB</div>
            </div>
            {/*/!* macOS *!/*/}
            {/*<div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8 text-center shadow-lg hover:-translate-y-2 hover:bg-white/20 transition-all flex flex-col items-center">*/}
            {/*  <div className="text-4xl mb-4">🍎</div>*/}
            {/*  <h3 className="text-xl font-semibold mb-2">macOS</h3>*/}
            {/*  <p className="mb-4">支持 macOS 10.15+</p>*/}
            {/*  <a href="#" className="inline-flex items-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow hover:-translate-y-1 hover:shadow-xl transition-all mb-3">*/}
            {/*    <span>📥</span> 下载 macOS 版*/}
            {/*  </a>*/}
            {/*  <div className="text-xs opacity-70">版本 1.0.0 | 约 140MB</div>*/}
            {/*</div>*/}
            {/*/!* Linux *!/*/}
            {/*<div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8 text-center shadow-lg hover:-translate-y-2 hover:bg-white/20 transition-all flex flex-col items-center">*/}
            {/*  <div className="text-4xl mb-4">🐧</div>*/}
            {/*  <h3 className="text-xl font-semibold mb-2">Linux</h3>*/}
            {/*  <p className="mb-4">支持 Ubuntu/Debian</p>*/}
            {/*  <a href="#" className="inline-flex items-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow hover:-translate-y-1 hover:shadow-xl transition-all mb-3">*/}
            {/*    <span>📥</span> 下载 Linux 版*/}
            {/*  </a>*/}
            {/*  <div className="text-xs opacity-70">版本 1.0.0 | 约 145MB</div>*/}
            {/*</div>*/}
          </div>
          {/*<div className="max-w-2xl mx-auto bg-white/10 backdrop-blur rounded-xl border border-white/20 p-8 text-white">*/}
          {/*  <h4 className="text-lg font-bold mb-4 text-center">系统要求</h4>*/}
          {/*  <ul className="text-sm space-y-2">*/}
          {/*    <li><strong>Windows:</strong> Windows 10 (1903) 或更高版本</li>*/}
          {/*    <li><strong>macOS:</strong> macOS 10.15 (Catalina) 或更高版本</li>*/}
          {/*    <li><strong>Linux:</strong> Ubuntu 18.04+ / Debian 10+ 或同等发行版</li>*/}
          {/*    <li><strong>内存:</strong> 最少 4GB RAM，推荐 8GB 或更多</li>*/}
          {/*    <li><strong>存储:</strong> 至少 500MB 可用空间</li>*/}
          {/*  </ul>*/}
          {/*</div>*/}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-slate-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div className="space-y-4">
              <div className="flex items-center">
                <img src="/icons/icon-192x192.png" alt="AI提效" className="w-8 h-8 mr-3" />
                <span className="text-xl font-semibold">AI提效</span>
              </div>
              <p className="text-slate-300">智能任务管理，让效率提升看得见</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-slate-200">产品</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-slate-300 hover:text-white transition">功能特性</a></li>
                <li><a href="#download" className="text-slate-300 hover:text-white transition">下载应用</a></li>
                <li><a href="#screenshots" className="text-slate-300 hover:text-white transition">界面预览</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-slate-200">支持</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={openContactModal}
                    className="text-slate-300 hover:text-white transition text-left"
                  >
                    联系我们
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; 2025 AI提效. 保留所有权利.
            </p>
          </div>
        </div>
      </footer>

      {/* 联系我们浮窗 */}
      {isContactModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] transition-all duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeContactModal()
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-[92%] max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300">
            {/* 模态框头部 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-t-3xl flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <span>💬</span>
                联系我们
              </h3>
              <button 
                onClick={closeContactModal}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all hover:rotate-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-8 space-y-6">
              {/* QQ交流群 */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>🎯</span>
                    QQ交流群
                  </h4>
                  <p className="text-3xl font-bold text-indigo-600 font-mono">1057464388</p>
                  <button 
                    onClick={copyQQNumber}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>📋</span>
                    复制群号
                  </button>
                </div>
              </div>

              {/* 邮箱联系 */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>✉️</span>
                    邮箱联系
                  </h4>
                  <p className="text-lg text-slate-700">707495862@qq.com</p>
                  <button 
                    onClick={copyEmail}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>📋</span>
                    复制邮箱
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-[10001] flex items-center gap-2 animate-bounce">
          <span>✅</span>
          {toastMessage}
        </div>
      )}
    </>
  )
} 