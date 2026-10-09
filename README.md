# 映光 · Halo

为 YouTube、哔哩哔哩和 X 添加随视频变化的环境光。支持 Chrome、Safari 和桌面版 Firefox。

1.2 起使用独立的视频采样与渲染引擎。三个站点共用帧调度、设置通信和错误恢复，不再加载旧项目的脚本、界面或注入桥接。播放器延迟加载时自动等待，切换视频后自动重新连接。

[下载安装包](https://github.com/Elys1an-Y1san/Halo/releases/latest) · [观看演示](https://elys1an-y1san.github.io/Halo/) · [反馈问题](https://github.com/Elys1an-Y1san/Halo/issues)

## 使用

打开视频页，点击「映光」。选择柔和、影院或漫射，也可以用滑块或直接输入数值，调整光边柔和程度、覆盖范围和亮度。

- 在「方案」页中命名并保存光效，最多保存 12 个方案。同名保存会更新原方案，可以撤销。
- 切换预设后，点击「恢复上次自定义」找回最近手调的参数。各网站分别保存设置和方案。
- 点击「对比原画」暂时隐藏环境光，再次点击恢复。关闭面板、切换窗口或关闭弹窗也会结束对比，不改保存的开关状态。
- 「恢复默认光效」只重置三个光效参数，保留开关状态。误操作可点击「撤销」。
- 性能档位限制环境光采样上限：节能 15、均衡 30、流畅 60 帧/秒，不改变视频帧率。
- 滚动时复用视频列表，并合并播放器发现任务；隐藏标签页暂停发现与采样，返回后自动恢复。暂停播放时保留最后一帧光效。
- 拖动页面上的「映光」按钮可自由移动，位置按网站记忆；Alt + 方向键可微调。在「偏好 → 位置」选择自动、左侧或右侧可复位。
- 哔哩哔哩滚动进入页面小窗时停止环境光，回到主播放器后自动恢复；不会改变保存的开关状态。
- X 信息流优先跟随可见的播放中视频；滚出画面后停止采样，媒体弹窗中的视频优先。

面板会显示正在生效、等待视频、暂停渲染或连接失败等状态。环境光关闭时仍可预调参数，下次开启后生效。性能、位置和更新入口在「偏好」页中。

设置保存在浏览器本地，无需账号。版本查询不发送浏览网址，不包含崩溃上报。

## 安装

从发行页下载对应安装包并解压。源码仓库不再收录生成的浏览器包和应用；本地构建方法见下文。当前源码为 1.2.1，发行页版本以实际发布为准。

| 浏览器 | 安装方式 |
| --- | --- |
| Chrome | 打开 `chrome://extensions`，启用开发者模式，点击「加载已解压的扩展程序」，选择包内 `Chrome` 文件夹 |
| Windows Chrome | 解压 Windows 包，按包内「README.md」操作；也可按上面的方式加载 `Chrome` 文件夹 |
| Firefox 128+ | 打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择包内 `manifest.json` |
| Safari | 将包内 `Halo.app` 放到「应用程序」并打开，在 Safari 扩展设置中启用映光、允许网站访问 |

安装后刷新已有的视频页。手动更新时保留原安装路径，覆盖文件后重新加载扩展并刷新视频页。

Firefox 包尚未签名，只供临时加载，重启浏览器后需要重新加载。Safari 本地构建使用开发证书，未公证，首次启用受系统开发设置影响。跨浏览器真实站点运行情况仍需分别验证。

## 开发

需要 Node.js 22+、Python 3。构建原生应用还需要 macOS、Xcode 和可用的 Apple 签名证书。

```sh
cd Source
npm ci --ignore-scripts
npm run build
python3 package-halo.py
```

生成 `Builds/chromium/<版本>/Chrome/`、`Builds/firefox/<版本>/Firefox/`、原生扩展资源及未签名测试包。构建完整 Safari 应用运行 `./build-macos.sh`；构建 Windows 安装包在仓库根目录运行 `python3 Source/package-windows.py`。

```sh
# 在 Source 中运行
node --test tests/*.test.cjs
node tests/render-regression.cjs
python3 tests/package-check.py
python3 tests/ui-fixture/serve.py
```

本地预览为 `http://127.0.0.1:8765/preview.html`。`suite.html` 检查已有流程，`features.html` 检查方案、撤销、对比、精确输入及渲染适配。运行浏览器测试时保持测试页可见，视频移出可视区会暂停采样。测试页使用模拟扩展接口，不替代真实视频网站验收。

可选浏览器测试需要另行提供 Playwright 和对应浏览器：`node tests/browser-check.cjs` 运行交互回归；`node tests/performance.cjs` 自行启动本地测试服务，统计多视频滚动、内容变化、暂停和模拟隐藏场景中的扫描、样式读取、布局读取及采样次数，并检查性能预算和恢复行为。设置 `HALO_NO_VIDEO_CALLBACKS=1` 可验证备用帧调度。结果保存在 `.build/performance/`，这些工作量计数不代表真实视频网站的 CPU 降幅。

源码与测试放在 `Source/`，演示页和签名更新源放在 `docs/`。本地构建统一放在 `Builds/`，按 `chromium/`、`firefox/`、`safari/` 分类，每类保留当前版和三个历史版本；`current` 指向当前版。完成原生构建后运行 `python3 Source/package-release.py` 生成各类安装包。

构建产物、截图和工作记录不提交；文档仅保留 README 与 AI 指令文件。`LICENSE`、程序页面和签名更新源随源码保留。

## 致谢

旧版本曾使用 [youtube-ambilight](https://github.com/WesselKroos/youtube-ambilight/tree/18d17188e5562e5ee913f005192d30c9a60be078)，相关版权声明保留在 LICENSE 中；当前运行时已替换。Safari 更新器使用 [Sparkle](https://github.com/sparkle-project/Sparkle) 2.10.0，许可随源码保留。
