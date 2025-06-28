'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 这里添加重置密码的逻辑
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟API请求
      
      toast({
        title: "重置链接已发送",
        description: "请检查您的邮箱以获取重置密码的链接",
      });
      
      // 重定向到登录页面
      router.push("/login");
    } catch (error) {
      toast({
        title: "发生错误",
        description: "无法发送重置密码链接，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-md p-6 mx-auto">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">重置密码</h1>
        <p className="text-gray-500 dark:text-gray-400">
          输入您的电子邮件地址，我们将向您发送重置密码的链接
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">电子邮件</Label>
          <Input 
            id="email"
            placeholder="example@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "发送中..." : "发送重置链接"}
        </Button>
      </form>
      <div className="text-center">
        <Button 
          variant="link" 
          className="text-sm"
          onClick={() => router.push("/login")}
        >
          返回登录
        </Button>
      </div>
    </div>
  );
} 