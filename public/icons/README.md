# 图标规范

## 图标格式要求
- 文件格式：SVG格式优先，PNG作为备选（需要提供@1x和@2x尺寸）
- 尺寸规范：基础图标尺寸为24x24px
- 线条粗细：1.5px统一线条粗细
- 圆角：2px统一圆角
- 颜色：使用当前主题色，避免硬编码颜色值

## 命名规则
- 使用kebab-case命名方式（例如：file-document.svg）
- 功能名在前，修饰词在后（例如：chart-bar.svg, chart-pie.svg）
- 方向类图标使用方向后缀（例如：arrow-up.svg, arrow-down.svg）

## 分类目录
- /actions - 表示动作的图标（添加、删除、编辑等）
- /objects - 表示对象的图标（文件、文档、图片等）
- /navigation - 导航相关图标（箭头、菜单等）
- /status - 状态相关图标（成功、警告、错误等）

## 使用方法
在组件中引用图标时，请使用相对路径导入：
```jsx
<img src="/icons/actions/add.svg" alt="添加" />
```

或者在CSS中使用：
```css
.add-button {
  background-image: url('/icons/actions/add.svg');
}
``` 