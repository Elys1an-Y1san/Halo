# 验证记录

版本：1.0.2 / 原生构建 8。日期：2026-10-02。

## 本次结果

| 检查 | 结果 | 范围 |
| :-- | :-- | :-- |
| 面板开合与连续切换 | 14 / 14 | 入场、退场、焦点、inert、快速反向、尺寸与起点 |
| 整页扩散 | 17 / 17 | 真实层裁剪、文字/背景空间变化、活视频、反向、清理 |
| 异步渲染桥接 | 11 / 11 | 就绪等待、运行帧、最终零遮罩、网站新样式所有权 |
| 视频采样适配 | 9 / 9 | 采样、预设保存、关闭、恢复与焦点 |
| 工具栏弹窗 | 19 / 19 | 两站隔离、持久化、动效、可访问值、错误恢复 |
| 查询更新界面 | 9 / 9 | 查询中、新版、当前版、限流、断网、无效链接 |
| 边界与减少动态 | 9 / 9 | 缺失视频、等待期间反向、系统减少动态 |
| 更新模块单元检查 | 15 / 15 | 数值比较、固定匿名请求、缓存、去重、超时与重试 |
| 安装资源 | 通过 | Chrome 31 引用 / Safari 32 引用；共享脚本与源码逐字节一致 |
| Blur / Spread 回归 | 通过 | 模糊像素和扩散比例 |
| 播放器策略 | 通过 | 12 支持路由、5 拒绝路由与播放器选择规则 |
| 网页构建 | 通过 | 从源码构建，无需本地凭据与上传 sourcemap |
| 原生构建 | 通过 | Release、arm64、开发签名；codesign 深层校验通过 |

浏览器断言共 88 项，通过 88 项。JSON 证据在 [browser-results.json](evidence/browser-results.json)；边界测试在 [edge-results.json](evidence/edge-results.json)；桌面交互检查在 [interactive-results.json](evidence/interactive-results.json)。测试视频由 Canvas 的实时 captureStream 生成，演示在 Chromium 中实际运行录制。

## 滚动条与坐标修复

旧版开关装饰光圈会产生最高 6px 横向溢出。新版以面板横向裁剪、40px 光圈、固定按钮锚点和稳定滚动条槽处理。桌面测试中，开关前后面板 clientWidth / clientHeight 均为 347 / 480，开关位置最大位移为 0px。

320×380 的嵌入视口与 396×380 的短弹窗分别测试。面板在短窗口使用纵向滚动；面板 scrollWidth 等于 clientWidth，页面 scrollWidth 等于视口宽度，未产生横向滚动。桌面浏览器使用经典滚动条时，320px iframe 的实际可用宽度为 305px，同样无横向溢出。

光波按 documentElement 的可用视口计算，渲染器就绪后重新测量。面板刚打开即开关、已有光波快速反向时，先结束面板位移动画再使用起点，避免动画坐标漂移。

## 公开发行验证

公开发行 v1.0.2 后，更新模块用实际匿名请求确认：当前 1.0.2 无需更新，旧版 1.0.1 可更新至 1.0.2。浏览器界面显示「已是最新版本 1.0.2」，见 [live-update.json](evidence/live-update.json)。

重新克隆公开发行标签后，应用深层签名校验与安装资源检查再次通过。线上构建 Checks 工作流通过。README 的封面、截图与 GIF 在公开页面正常加载。

## 复现

在 Source 目录运行：

```bash
node --test tests/update.test.cjs
node tests/render-regression.cjs
node tests/bilibili-policy.test.cjs
python3 tests/package-check.py
python3 tests/ui-fixture/serve.py
```

浏览器夹具：

- `/wave.html?paneltest`：面板与滚动条。
- `/wave.html?test`：整页光波与视频持续更新。
- `/youtube-wave.html?test`：异步渲染器契约。
- `/bilibili-panel.html`：视频采样与设置联动。
- `/test.html`：工具栏弹窗。
- `/update-test.html`：模拟发行接口与错误路径。
- `/responsive.html`：真实嵌入式窄视口。

可选自动浏览器测试与录制需要安装 Playwright 及 Chromium。在服务器运行时执行 `node tests/browser-check.cjs` 或 `node tests/record-demo.cjs`。已有 Chrome 可通过 `HALO_CHROME_PATH` 指定可执行文件。

## 验证边界

本次验证覆盖本地动态视频、实际 DOM 渲染与扩展接口夹具，尚未重新完成真实视频网站中的新安装、登录/付费、所有番剧/直播/站内跳转组合验收。Safari 的原生编译和签名校验通过；首次启用和跨机器安装不等同于编译验证。运行范围与安装步骤见 [INSTALL](INSTALL.md)。
