"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserSession } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { type Task, getUserTasks } from "@/lib/tasks"
import { type Note, getUserNotes } from "@/lib/notes"

export default function StatsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const { toast } = useToast()

  // 获取用户会话
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getUserSession()
        if (!session) {
          router.push("/login")
          return
        }

        setUser(session)
        loadUserData(session.id)
      } catch (error) {
        console.error("Session error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  // 加载用户数据
  const loadUserData = async (userId: string) => {
    try {
      // 加载任务
      const userTasks = await getUserTasks(userId)
      setTasks(userTasks)

      // 加载备忘录
      const userNotes = await getUserNotes(userId)
      setNotes(userNotes)
    } catch (error) {
      console.error("Error loading user data:", error)
      toast({
        title: "加载失败",
        description: "无法加载数据，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 计算任务统计数据
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    active: tasks.filter((task) => !task.completed).length,
    overdue: tasks.filter((task) => {
      if (!task.due_date || task.completed) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(task.due_date)
      return dueDate < today
    }).length,
    byQuadrant: [
      { name: "紧急且重要", value: tasks.filter((task) => task.quadrant === 1 && !task.completed).length },
      { name: "重要不紧急", value: tasks.filter((task) => task.quadrant === 2 && !task.completed).length },
      { name: "紧急不重要", value: tasks.filter((task) => task.quadrant === 3 && !task.completed).length },
      { name: "不紧急不重要", value: tasks.filter((task) => task.quadrant === 4 && !task.completed).length },
    ],
    byTag: (() => {
      const tagCounts: Record<string, number> = {}
      tasks
        .filter((task) => !task.completed)
        .forEach((task) => {
          task.tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        })
      return Object.entries(tagCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // 只取前5个标签
    })(),
  }

  // 计算备忘录统计数据
  const noteStats = {
    total: notes.length,
    avgLength:
      notes.length > 0 ? Math.round(notes.reduce((sum, note) => sum + note.content.length, 0) / notes.length) : 0,
    byMonth: (() => {
      const monthCounts: Record<string, number> = {}
      notes.forEach((note) => {
        const date = new Date(note.created_at)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1
      })
      return Object.entries(monthCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-6) // 只取最近6个月
    })(),
  }

  // 饼图颜色
  const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28"]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center my-6">
        <h1 className="text-2xl font-bold">数据统计</h1>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">任务统计</TabsTrigger>
          <TabsTrigger value="notes">备忘录统计</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          {/* 任务概览卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">总任务数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">已完成任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.completed}</div>
                <Progress
                  value={taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">进行中任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">已过期任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{taskStats.overdue}</div>
              </CardContent>
            </Card>
          </div>

          {/* 任务分布图表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>任务象限分布</CardTitle>
                <CardDescription>按四象限分类的任务数量</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={taskStats.byQuadrant}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ value }) => `${value}`}
                        outerRadius={({ viewBox }) => Math.min(viewBox.width, viewBox.height) / 3}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {taskStats.byQuadrant.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>标签分布</CardTitle>
                <CardDescription>按标签分类的任务数量（前5个）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskStats.byTag}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: "0.75rem" }}
                        tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 10)}...` : value)}
                      />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          {/* 备忘录概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">备忘录总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{noteStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均字数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{noteStats.avgLength}</div>
              </CardContent>
            </Card>
          </div>

          {/* 备忘录分布图表 */}
          <Card>
            <CardHeader>
              <CardTitle>备忘录创建趋势</CardTitle>
              <CardDescription>最近6个月的备忘录创建数量</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noteStats.byMonth} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: "0.75rem" }}
                      tickFormatter={(value) => {
                        // 在移动端简化日期显示
                        const parts = value.split("-")
                        return window.innerWidth < 640 ? parts[1] : value
                      }}
                    />
                    <YAxis tick={{ fontSize: "0.75rem" }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

