'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { Palette, Sun, Moon, Eye, Maximize, Settings, RotateCcw, X } from 'lucide-react'
import { hexToHSL, hslToHex } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { saveUserThemeSettings, getUserThemeSettings, type ThemeSettings } from '@/lib/theme-service'
import { useToast } from "@/hooks/use-toast"

// 创建主题上下文
interface ThemeContextType {
  theme: string;
  changeTheme: (theme: string) => void;
  customColors: {
    primary: string;
    secondary: string;
    background: string;
  };
  handleColorChange: (colorType: 'primary' | 'secondary' | 'background', value: string, applyImmediately?: boolean) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetToDefault: () => void;
  recentThemes: Array<{name: string, colors: {primary: string, secondary: string, background: string}}>;
  applySavedTheme: (colors: {primary: string, secondary: string, background: string}) => void;
  presetThemes: Array<{name: string, label: string, icon: React.ReactNode}>;
  isSyncing: boolean;
  syncError: string | null;
  saveThemeSettings: () => Promise<boolean>;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // 预设主题列表
  const PRESET_THEMES = [
    { name: 'default', label: '明亮模式', icon: <Sun size={18} /> },
    { name: 'dark', label: '深色模式', icon: <Moon size={18} /> },
    { name: 'eyecare', label: '护眼模式', icon: <Eye size={18} /> },
    { name: 'highcontrast', label: '高对比度', icon: <Maximize size={18} /> },
  ];
  
  // 颜色自定义存储键
  const CUSTOM_THEME_KEY = 'app-custom-themes';
  const MAX_STORED_THEMES = 3;

  // 状态定义
  const [theme, setTheme] = React.useState<string>('default');
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [customColors, setCustomColors] = React.useState({
    primary: '#2196F3',
    secondary: '#E0E0E0',
    background: '#FFFFFF'
  });
  const [recentThemes, setRecentThemes] = React.useState<Array<{name: string, colors: typeof customColors}>>([]);
  // 添加同步状态标记
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  
  // 应用主题
  const applyTheme = React.useCallback((newTheme: string) => {
    // 检查是否是复合主题（例如 dark-custom）
    const [baseTheme, customFlag] = newTheme.split('-');
    
    // 移除所有主题类
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove(
        'theme-dark',
        'theme-eyecare',
        'theme-highcontrast',
        'theme-custom'
      );
      
      // 添加基础主题类
      if (baseTheme !== 'default') {
        document.documentElement.classList.add(`theme-${baseTheme}`);
      }
      
      // 如果有自定义标记，添加自定义类
      if (customFlag === 'custom') {
        document.documentElement.classList.add('theme-custom');
      }

      // 应用过渡动画
      const root = document.documentElement;
      root.style.setProperty('transition', 'background-color 300ms ease, color 300ms ease, border-color 300ms ease');

      // 强制重绘以确保样式应用
      document.body.offsetHeight;
      
      // 更新按钮和UI元素的CSS变量
      updateUIElements();
    }
  }, []);
  
  // 更新UI元素样式
  const updateUIElements = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue('--primary');
    const bgColor = getComputedStyle(root).getPropertyValue('--background');
    
    document.querySelectorAll('.task-item, .glass-morphism').forEach(el => {
      (el as HTMLElement).style.transition = 'all 300ms ease';
    });
  }, []);

  // 切换主题
  const changeTheme = React.useCallback((newTheme: string) => {
    setTheme(newTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-theme', newTheme);
      
      // 如果切换到预设主题，清除任何自定义样式
      if (PRESET_THEMES.some(t => t.name === newTheme)) {
        const root = document.documentElement;
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--ring');
        root.style.removeProperty('--secondary');
        root.style.removeProperty('--muted');
        root.style.removeProperty('--background');
        root.style.removeProperty('--card');
        root.style.removeProperty('--popover');
        root.style.removeProperty('--foreground');
        root.style.removeProperty('--card-foreground');
        root.style.removeProperty('--popover-foreground');
        root.style.removeProperty('--secondary-foreground');
        root.style.removeProperty('--muted-foreground');
        root.style.removeProperty('--border');
        root.style.removeProperty('--input');
      }
    }
    
    applyTheme(newTheme);
    
    // 同步到后端
    syncThemeToBackend();
  }, [applyTheme]);

  // 同步主题到后端
  const themeRef = React.useRef(theme);
  const customColorsRef = React.useRef(customColors);
  const recentThemesRef = React.useRef(recentThemes);

  React.useEffect(() => {
    themeRef.current = theme;
    customColorsRef.current = customColors;
    recentThemesRef.current = recentThemes;
  }, [theme, customColors, recentThemes]);

  const syncThemeToBackend = React.useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const themeSettings: ThemeSettings = {
        currentTheme: themeRef.current,
        customColors: customColorsRef.current,
        recentThemes: recentThemesRef.current
      };
      
      const success = await saveUserThemeSettings(themeSettings);
      
      if (!success) {
        console.log('使用本地存储作为后备');
      }
      
      return success;
    } catch (error) {
      console.error('同步主题到后端失败:', error);
      setSyncError('保存失败，请稍后再试');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 保存自定义主题到本地存储
  const saveCustomTheme = React.useCallback((colors: typeof customColors) => {
    const newCustomTheme = { name: 'custom', colors };
    
    setRecentThemes(prev => {
      const updatedThemes = [
        newCustomTheme,
        ...prev.filter(t => JSON.stringify(t.colors) !== JSON.stringify(colors))
      ].slice(0, MAX_STORED_THEMES);

      if (typeof window !== 'undefined') {
        localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(updatedThemes));
      }

      return updatedThemes;
    });
    
    syncThemeToBackend();
  }, [syncThemeToBackend]);

  // 应用自定义颜色
  const applyCustomColors = React.useCallback((colors: typeof customColors) => {
    if (typeof document === 'undefined') return;
    
    // 将十六进制颜色转换为HSL格式
    try {
      const primaryHSL = hexToHSL(colors.primary);
      const secondaryHSL = hexToHSL(colors.secondary);
      const backgroundHSL = hexToHSL(colors.background);
      
      // 设置自定义CSS变量
      const root = document.documentElement;
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--accent', primaryHSL);
      root.style.setProperty('--ring', primaryHSL);
      
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--muted', secondaryHSL);
      
      root.style.setProperty('--background', backgroundHSL);
      root.style.setProperty('--card', backgroundHSL);
      root.style.setProperty('--popover', backgroundHSL);
      
      // 根据背景色亮度自动调整文字颜色
      const isDark = parseInt(backgroundHSL.split(' ')[2]) < 50;
      if (isDark) {
        root.style.setProperty('--foreground', '0 0% 90%');
        root.style.setProperty('--card-foreground', '0 0% 90%');
        root.style.setProperty('--popover-foreground', '0 0% 90%');
        root.style.setProperty('--secondary-foreground', '0 0% 90%');
        root.style.setProperty('--muted-foreground', '0 0% 70%');
      } else {
        root.style.setProperty('--foreground', '0 0% 10%');
        root.style.setProperty('--card-foreground', '0 0% 10%');
        root.style.setProperty('--popover-foreground', '0 0% 10%');
        root.style.setProperty('--secondary-foreground', '0 0% 10%');
        root.style.setProperty('--muted-foreground', '0 0% 40%');
      }
      
      // 更新border颜色
      root.style.setProperty('--border', isDark ? '0 0% 30%' : '0 0% 90%');
      root.style.setProperty('--input', isDark ? '0 0% 30%' : '0 0% 90%');
      
      // 保存到本地自定义主题
      saveCustomTheme(colors);
      
      // 更新UI元素
      updateUIElements();
    } catch (error) {
      console.error("Error applying custom colors:", error);
    }
  }, [updateUIElements, saveCustomTheme]);
  
  // 重置为默认配色
  const resetToDefault = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    
    // 移除所有自定义样式和主题类
    const root = document.documentElement;
    root.classList.remove('theme-custom', 'theme-dark', 'theme-eyecare', 'theme-highcontrast');
    
    // 重置默认颜色值
    setCustomColors({
      primary: '#2196F3',
      secondary: '#E0E0E0',
      background: '#FFFFFF'
    });
    
    // 清除所有可能被设置的内联 CSS 变量
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--muted');
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--popover');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--card-foreground');
    root.style.removeProperty('--popover-foreground');
    root.style.removeProperty('--secondary-foreground');
    root.style.removeProperty('--muted-foreground');
    root.style.removeProperty('--border');
    root.style.removeProperty('--input');
    
    // 设置并保存主题为默认
    setTheme('default');
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-theme', 'default');
    }
    
    // 强制重新渲染
    document.body.offsetHeight;
    
    // 更新UI元素
    updateUIElements();
  }, [updateUIElements]);
  
  // 应用已保存的自定义主题
  const applySavedTheme = React.useCallback((savedTheme: typeof customColors) => {
    setCustomColors(savedTheme);
    applyCustomColors(savedTheme);
    changeTheme('custom');
    // 同步由changeTheme处理，无需重复
  }, [applyCustomColors, changeTheme]);

  // 获取当前主题模式（不包括自定义部分）
  const getThemeMode = React.useCallback(() => {
    if (typeof document === 'undefined') return 'default';
    
    const currentClasses = document.documentElement.classList;
    if (currentClasses.contains('theme-dark')) return 'dark';
    if (currentClasses.contains('theme-eyecare')) return 'eyecare';
    if (currentClasses.contains('theme-highcontrast')) return 'highcontrast';
    return 'default';
  }, []);

  // 颜色变更处理
  const handleColorChange = React.useCallback((
    colorType: keyof typeof customColors, 
    value: string, 
    applyImmediately: boolean = false
  ) => {
    setCustomColors(prev => ({ ...prev, [colorType]: value }));
    
    if (!applyImmediately) return;
    
    const currentThemeMode = getThemeMode();
    const newColors = { ...customColorsRef.current, [colorType]: value };
    
    applyCustomColors(newColors);
    
    if (currentThemeMode === 'default') {
      changeTheme('custom');
    } else {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('theme-custom');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('app-theme', `${currentThemeMode}-custom`);
      }
      setTheme(`${currentThemeMode}-custom`);
    }
  }, [applyCustomColors, changeTheme, getThemeMode]);

  // 从后端加载主题设置
  const loadThemeFromBackend = React.useCallback(async () => {
    try {
      const backendThemeSettings = await getUserThemeSettings();
      
      if (backendThemeSettings) {
        // 从后端成功获取数据，应用主题设置
        setTheme(backendThemeSettings.currentTheme);
        setCustomColors(backendThemeSettings.customColors);
        setRecentThemes(backendThemeSettings.recentThemes);
        applyTheme(backendThemeSettings.currentTheme);
        
        // 如果是自定义主题，还需要应用自定义颜色
        if (backendThemeSettings.currentTheme === 'custom' || 
            backendThemeSettings.currentTheme.includes('-custom')) {
          applyCustomColors(backendThemeSettings.customColors);
        }
        
        // 更新本地存储以保持同步
        if (typeof window !== 'undefined') {
          localStorage.setItem('app-theme', backendThemeSettings.currentTheme);
          localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(backendThemeSettings.recentThemes));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('从后端加载主题设置失败:', error);
      return false;
    }
  }, [applyTheme, applyCustomColors]);

  // 从本地存储加载主题设置
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeTheme = async () => {
      // 首先尝试从后端加载，如果失败则从本地存储加载
      const backendLoadSuccess = await loadThemeFromBackend();
      
      if (!backendLoadSuccess) {
        // 回退到本地存储
        // 加载当前主题
        const savedTheme = localStorage.getItem('app-theme') || 'default';
        setTheme(savedTheme);
        applyTheme(savedTheme);

        // 加载自定义主题列表
        try {
          const savedCustomThemes = localStorage.getItem(CUSTOM_THEME_KEY);
          if (savedCustomThemes) {
            setRecentThemes(JSON.parse(savedCustomThemes));
          }
        } catch (error) {
          console.error('Failed to load custom themes:', error);
        }
      }
    };
    
    initializeTheme();

    // 添加键盘快捷键监听
    // const handleKeyDown = (e: KeyboardEvent) => {
    //   // Ctrl/Cmd + T 切换主题面板
    //   if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    //     e.preventDefault();
    //     setIsPanelOpen(prev => !prev);
    //   }
    // };
    //
    // window.addEventListener('keydown', handleKeyDown);
    // return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyTheme, loadThemeFromBackend]);

  // 显示保存当前主题设置
  const saveThemeSettings = React.useCallback(async () => {
    return await syncThemeToBackend();
  }, [syncThemeToBackend]);

  // 创建上下文值
  const contextValue = React.useMemo(() => ({
    theme,
    changeTheme,
    customColors,
    handleColorChange,
    isPanelOpen,
    setIsPanelOpen,
    resetToDefault,
    recentThemes,
    applySavedTheme,
    presetThemes: PRESET_THEMES,
    isSyncing,
    syncError,
    saveThemeSettings
  }), [
    theme,
    changeTheme,
    customColors,
    handleColorChange,
    isPanelOpen,
    resetToDefault,
    recentThemes,
    applySavedTheme,
    isSyncing,
    syncError,
    saveThemeSettings
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeContext.Provider>
  );
}

// 导出自定义 useTheme 钩子
export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内部使用');
  }
  return context;
}

// 主题切换组件
export function ThemeSwitcher({ 
  buttonRef 
}: { 
  buttonRef?: React.RefObject<HTMLButtonElement | null> 
}) {
  const pathname = usePathname();
  const { toast } = useToast(); // 移到顶层，确保无条件调用
  
  // 判断是否是登录或注册页面
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';
  
  // 如果是登录或注册页面，不显示主题切换按钮
  if (isAuthPage) return null;
  
  const { 
    theme, 
    changeTheme, 
    customColors,
    handleColorChange,
    isPanelOpen, 
    setIsPanelOpen,
    resetToDefault,
    recentThemes,
    applySavedTheme,
    presetThemes,
    isSyncing,
    syncError,
    saveThemeSettings
  } = useTheme();

  // 检测侧边栏是否折叠
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  // 记录面板位置
  const [panelPosition, setPanelPosition] = React.useState({ top: 0, left: 0 });
  // 控制面板可见性的状态
  const [isPanelVisible, setIsPanelVisible] = React.useState(false);
  
  // 更新面板位置
  const updatePanelPosition = React.useCallback(() => {
    if (buttonRef?.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // 移动设备的判断
      const isMobile = windowWidth < 768;
      
      if (isMobile) {
        // 移动设备上固定在顶部
        setPanelPosition({
          top: 80,
          left: 16
        });
      } else {
        // 使用按钮的顶部位置，并添加向上偏移量确保完全可见
        const topPos = buttonRect.top - 60; // 向上偏移40px
        
        // 确保面板不会超出屏幕底部或顶部
        const maxPanelHeight = 650; // 增加估计高度
        let finalTop = topPos;
        
        // 如果面板底部会超出屏幕
        if (topPos + maxPanelHeight > windowHeight) {
          finalTop = windowHeight - maxPanelHeight - 20; // 距底部20px
        }
        
        // 如果面板顶部会超出屏幕
        if (topPos < 20) {
          finalTop = 20; // 距顶部20px
        }
        
        // 确保左侧位置不超出屏幕
        const leftPos = Math.min(buttonRect.right + 15, windowWidth - 300);
        
        setPanelPosition({
          top: finalTop,
          left: leftPos // 按钮右侧15px处，但不超出屏幕
        });
      }
    }
  }, [buttonRef]);
  
  // 打开面板时的处理
  const handleOpenPanel = React.useCallback(() => {
    // 先计算位置，然后再显示面板
    if (buttonRef?.current) {
      updatePanelPosition();
      // 直接设置为可见，不使用延迟
      setIsPanelVisible(true);
    } else {
      setIsPanelVisible(true);
    }
  }, [buttonRef, updatePanelPosition]);
  
  // 监听面板打开状态变化
  React.useEffect(() => {
    if (isPanelOpen) {
      handleOpenPanel();
    } else {
      setIsPanelVisible(false);
    }
  }, [isPanelOpen, handleOpenPanel]);
  
  // 监听按钮位置变化和侧边栏折叠状态
  React.useEffect(() => {
    // 从本地存储中读取侧边栏折叠状态
    if (typeof window !== 'undefined') {
      try {
        const savedCollapsedState = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsedState !== null) {
          setIsSidebarCollapsed(savedCollapsedState === 'true');
        }
      } catch (error) {
        console.error('无法读取侧边栏状态:', error);
      }
      
      // 添加窗口大小变化的监听器
      window.addEventListener('resize', () => {
        if (isPanelOpen) {
          updatePanelPosition();
        }
      });
      return () => window.removeEventListener('resize', updatePanelPosition);
    }
  }, [updatePanelPosition, isPanelOpen]);
  
  // 保存结果状态
  const [saveMessage, setSaveMessage] = React.useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // 处理保存按钮点击
  const handleSaveClick = async () => {
    const success = await saveThemeSettings();
    
    if (success) {
      // 显示toast提示
      toast({
        title: "保存成功",
        description: "主题设置已成功保存",
        variant: "default",
      });
      
      // 关闭主题设置面板
      setIsPanelOpen(false);
    } else {
      // 保存失败时仅显示错误消息，不关闭面板
      setSaveMessage({ 
        type: 'error', 
        text: syncError || '保存失败，使用本地存储作为后备' 
      });
      
      // 5秒后清除错误消息
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  return (
    <>
      {/* 主题设置面板 - 使用isPanelVisible控制实际显示 */}
      {isPanelOpen && (
        <div 
          className="theme-panel"
          style={{
            position: 'fixed',
            top: `${panelPosition.top}px`,
            left: `${panelPosition.left}px`,
            zIndex: 50,
            opacity: isPanelVisible ? 1 : 0,
            pointerEvents: isPanelVisible ? 'auto' : 'none',
            transform: 'none' // 移除transform变换
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">主题设置</h3>
            <button 
              className="rounded-full p-1 hover:bg-background/80"
              onClick={() => setIsPanelOpen(false)}
              aria-label="关闭主题设置"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* 内容区域不再使用滚动容器 */}
          <div>
            {/* 预设主题 */}
            <div className="mb-4">
              <p className="text-sm mb-2 text-muted-foreground">预设主题</p>
              <div className="space-y-1">
                {presetThemes.map((t) => (
                  <div 
                    key={t.name}
                    className={`theme-option ${theme === t.name ? 'active' : ''}`}
                    onClick={() => changeTheme(t.name)}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 颜色自定义 */}
            <div>
              <div className="flex justify-between items-center">
                <p className="text-sm mb-2 text-muted-foreground">自定义颜色</p>
                <button 
                  onClick={resetToDefault}
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  重置
                </button>
              </div>
              
              <div className="color-picker-wrapper">
                <div className="color-item">
                  <label className="text-sm">主色调</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: customColors.primary }}
                    ></div>
                    <input 
                      type="color" 
                      value={customColors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      onBlur={(e) => handleColorChange('primary', e.target.value, true)}
                    />
                  </div>
                </div>
                
                <div className="color-item">
                  <label className="text-sm">辅助色</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: customColors.secondary }}
                    ></div>
                    <input 
                      type="color" 
                      value={customColors.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                      onBlur={(e) => handleColorChange('secondary', e.target.value, true)}
                    />
                  </div>
                </div>
                
                <div className="color-item">
                  <label className="text-sm">背景色</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: customColors.background }}
                    ></div>
                    <input 
                      type="color" 
                      value={customColors.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                      onBlur={(e) => handleColorChange('background', e.target.value, true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          
            {/* 最近使用的主题 */}
            {recentThemes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm mb-2 text-muted-foreground">最近使用</p>
                <div className="flex flex-wrap gap-2">
                  {recentThemes.map((savedTheme, index) => (
                    <button
                      key={index}
                      className="w-8 h-8 rounded-full border border-border"
                      style={{ backgroundColor: savedTheme.colors.primary }}
                      onClick={() => applySavedTheme(savedTheme.colors)}
                      aria-label={`应用自定义主题 ${index + 1}`}
                    ></button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 保存按钮和状态信息 */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleSaveClick}
                disabled={isSyncing}
                className={`save-button ${isSyncing ? 'save-button-disabled' : 'save-button-primary'}`}
              >
                {isSyncing ? '保存中...' : '保存设置'}
              </button>
              
              {saveMessage && (
                <div className={`save-message ${
                  saveMessage.type === 'success' 
                    ? 'save-message-success' 
                    : 'save-message-error'
                }`}>
                  {saveMessage.text}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            快捷键: Ctrl/Cmd + T
          </div>
        </div>
      )}
    </>
  );
}
