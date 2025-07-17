import Link from "next/link"
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <h2 className="text-2xl mb-4">页面未找到</h2>
      <p className="text-gray-600 mb-8">抱歉，您访问的页面不存在。</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        返回首页
      </Link>
    </div>
  )
} 