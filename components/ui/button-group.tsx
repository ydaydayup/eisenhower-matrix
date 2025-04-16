"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const ButtonGroupContext = React.createContext<{
  variant?: "default" | "outline" | "glass" | "pill"
  size?: "default" | "sm" | "lg"
  orientation?: "horizontal" | "vertical"
  activeIndex?: number
  setActiveIndex?: (index: number) => void
}>({})

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "glass" | "pill"
  size?: "default" | "sm" | "lg"
  orientation?: "horizontal" | "vertical"
  activeIndex?: number
  onActiveIndexChange?: (index: number) => void
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ 
    variant = "default", 
    size = "default", 
    orientation = "horizontal", 
    activeIndex = 0,
    onActiveIndexChange,
    className, 
    children, 
    ...props 
  }, ref) => {
    const [internalActiveIndex, setInternalActiveIndex] = React.useState(activeIndex)
    
    const currentActiveIndex = activeIndex !== undefined ? activeIndex : internalActiveIndex
    
    const setActiveIndex = React.useCallback((index: number) => {
      if (onActiveIndexChange) {
        onActiveIndexChange(index)
      } else {
        setInternalActiveIndex(index)
      }
    }, [onActiveIndexChange])
    
    return (
      <ButtonGroupContext.Provider 
        value={{ 
          variant, 
          size, 
          orientation,
          activeIndex: currentActiveIndex,
          setActiveIndex,
        }}
      >
        <div
          ref={ref}
          className={cn(
            "inline-flex",
            orientation === "horizontal" ? "flex-row" : "flex-col",
            variant === "default" && "bg-background border border-input rounded-md overflow-hidden",
            variant === "outline" && "bg-transparent border border-input rounded-md overflow-hidden",
            variant === "glass" && "glass-morphism rounded-full p-1",
            variant === "pill" && "bg-muted rounded-full p-1",
            className
          )}
          {...props}
        >
          {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                index,
                isActive: currentActiveIndex === index,
              })
            }
            return child
          })}
        </div>
      </ButtonGroupContext.Provider>
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

interface ButtonGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index?: number
  isActive?: boolean
}

const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  ({ 
    className, 
    children, 
    index, 
    isActive,
    ...props 
  }, ref) => {
    const { variant, size, orientation, setActiveIndex } = React.useContext(ButtonGroupContext)
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (props.onClick) {
        props.onClick(e)
      }
      if (index !== undefined && setActiveIndex) {
        setActiveIndex(index)
      }
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
          // Variant styles
          variant === "default" && "border-r last:border-r-0 hover:bg-accent",
          variant === "outline" && "border-r last:border-r-0 hover:bg-accent",
          variant === "glass" && "rounded-full",
          variant === "pill" && "rounded-full",
          // Active state
          variant === "default" && isActive && "bg-accent text-accent-foreground",
          variant === "outline" && isActive && "bg-accent text-accent-foreground",
          variant === "glass" && isActive && "bg-primary text-primary-foreground shadow",
          variant === "pill" && isActive && "bg-background shadow-sm",
          // Non-active state
          variant === "glass" && !isActive && "text-muted-foreground hover:text-foreground",
          variant === "pill" && !isActive && "text-muted-foreground hover:text-foreground",
          // Size styles
          size === "default" && "h-9 px-4 py-2",
          size === "sm" && "h-8 px-3 py-1 text-xs",
          size === "lg" && "h-10 px-6 py-2 text-base",
          // Orientation styles
          orientation === "vertical" && variant !== "glass" && variant !== "pill" && "border-r-0 border-b last:border-b-0",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ButtonGroupItem.displayName = "ButtonGroupItem"

export { ButtonGroup, ButtonGroupItem } 