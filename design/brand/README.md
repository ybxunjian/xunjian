# 品牌资源

项目品牌名为“云速巡检”，用于界面、安装名称、分享信息与备份提示。数据兼容标识独立维护，见[数据与同步](../../docs/data-and-sync.md#品牌名称与兼容标识)。

## 设计来源

[night-inspection-master.svg](./night-inspection-master.svg) 是图形唯一母版：透明背景、sRGB、无描边 Bézier 路径。

- 母版深蓝：#0f1f37。
- 青色渐变：#3deb9f → #18d8b9 → #08c1cd → #00a0e3。
- 路径与通道保持母版比例，不增加图形描边、发光或阴影。
- 登录透明图形深色外观使用 brand-ink 浅墨色变体；安装图标和分享图不跟随页面反色。

## 资源与用途

| 资源 | 用途 |
| --- | --- |
| [src/app/icon.svg](../../src/app/icon.svg) | 浏览器/应用图标，白色不透明背景 |
| [apple-icon.png](../../src/app/apple-icon.png) | 180×180 Apple Web Clip |
| [favicon.ico](../../src/app/favicon.ico) | 16/32/48/64 小尺寸图标 |
| [普通 192px](../../public/icons/night-inspection-192-v2.png)、[普通 512px](../../public/icons/night-inspection-512-v2.png) | PWA，purpose any |
| [Maskable 512px](../../public/icons/night-inspection-maskable-512-v2.png) | PWA，purpose maskable |
| [AuthLogo](../../src/features/auth/components/auth-screen.tsx) | 登录内嵌透明图形 |
| [独立透明导出](../../src/assets/night-inspection-logo.svg) | 核对及非页面用途，当前运行时不加载 |
| [分享源稿](./night-inspection-social-preview.svg) | 分享卡片的可编辑源 |
| [Open Graph](../../src/app/opengraph-image.png)、[Twitter](../../src/app/twitter-image.png) | 两张相同的 1200×630 PNG |

分享图采用深色背景、白色品牌标题和渐变强调线；源稿与两张 PNG 同步维护。Next.js 从图片及配套 alt.txt 文件生成分享元数据，应用标题在 layout.tsx，安装名称在 public/manifest.webmanifest。

## 修改与验收

修改图形母版时同步所有生产图标、内嵌图形与相关导出；仅修改分享卡片时同步源稿及两张分享 PNG。检查导出字体、裁切、尺寸和元数据引用，提交生产资源，避免依赖部署机器重新排版。

favicon 使用视觉裁切；Maskable 重要内容位于中心半径 40% 边长的安全圆。安装图标保留不透明背景，不预先裁切系统圆角。检查 16–512px 下的识别、边缘和颜色，分享图另看缩略预览。

生产源使用 SVG、PNG、ICO。archive 仅为设计留档，不作为运行时来源。资源删除与保留依据见[维护约定](../../GOVERNANCE.md)，构建验证见[开发与发布](../../docs/development.md#验证)。
