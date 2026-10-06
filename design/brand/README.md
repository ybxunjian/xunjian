# 品牌资源

[night-inspection-master.svg](./night-inspection-master.svg) 是品牌图形唯一设计母版：透明背景、sRGB 色值、无描边 Bézier 路径。界面使用方式见 [设计规范](../../DESIGN.md)，此处维护资产本身。

## 固定规范

- 深蓝：`#0f1f37`。
- 青色渐变：`#3deb9f` → `#18d8b9` → `#08c1cd` → `#00a0e3`。
- 相邻斜边平行、白色通道均匀；不添加预制圆角、描边、发光或图形阴影。
- 生产图标使用 SVG、PNG、ICO，不使用 JPEG 作为源。
- 浏览器与 Apple 图标为不透明白色方形背景，不预先裁切系统圆角；登录图形透明、56px，无独立蓝色圆底，与文字标题同时出现时 aria-hidden。

## 资源矩阵

| 资源 | 用途/尺寸 |
| --- | --- |
| [src/app/icon.svg](../../src/app/icon.svg) | 白底浏览器/应用图标 |
| [apple-icon.png](../../src/app/apple-icon.png) | 180×180 Apple Web Clip |
| [favicon.ico](../../src/app/favicon.ico) | 16/32/48/64 小尺寸视觉版 |
| [opengraph-image.png](../../src/app/opengraph-image.png)、[twitter-image.png](../../src/app/twitter-image.png) | 1200×630 分享卡片 |
| [auth-screen.tsx](../../src/features/auth/components/auth-screen.tsx) 内嵌 AuthLogo | 登录页透明品牌图形 |
| [night-inspection-192-v2.png](../../public/icons/night-inspection-192-v2.png)、[night-inspection-512-v2.png](../../public/icons/night-inspection-512-v2.png) | PWA 普通图标，purpose: any |
| [night-inspection-maskable-512-v2.png](../../public/icons/night-inspection-maskable-512-v2.png) | PWA Maskable，purpose: maskable |

[night-inspection-social-preview.svg](./night-inspection-social-preview.svg) 是分享卡片源稿，可增加背景与信息层级，内部品牌路径和色值保持母版一致。[src/assets/night-inspection-logo.svg](../../src/assets/night-inspection-logo.svg) 是独立透明导出，供核对及非页面用途，当前运行时不加载。

favicon 使用 `648 648 2800 2800` 正方形视觉裁切，提高 16px 主体占比。Maskable 使用不透明背景，全部重要品牌像素位于画布中心、半径为边长 40% 的安全圆内。

## 导出与验收

修改母版后同步全部生产资源、登录内嵌图形和分享源稿。检查 16、32、56、180、192、512px 下的识别度、抗锯齿、透明边缘、裁切和颜色一致性；同时核验 Next 元数据及 manifest 引用。

`archive/` 只用于设计过程留档，不作为运行时或 manifest 的资源源头。资产保留与代码删除依据见 [治理约定](../../GOVERNANCE.md)。
