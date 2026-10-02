<div align="center">

<img src="docs/media/hero.svg" width="100%" alt="映光 Halo，让画面，漫出边界。" />

[![Version](https://img.shields.io/github/v/release/Elys1an-Y1san/Halo?style=flat-square&color=f3c780&label=release)](https://github.com/Elys1an-Y1san/Halo/releases/latest)
[![Checks](https://github.com/Elys1an-Y1san/Halo/actions/workflows/checks.yml/badge.svg)](https://github.com/Elys1an-Y1san/Halo/actions/workflows/checks.yml)
[![MIT](https://img.shields.io/badge/license-MIT-f3c780?style=flat-square)](LICENSE)

为 YouTube 和哔哩哔哩添加随视频变化的环境光。

[安装指南](docs/INSTALL.md)　/　[发行版本](https://github.com/Elys1an-Y1san/Halo/releases)　/　[观看演示](https://elys1an-y1san.github.io/Halo/)

</div>

## 开启环境光

点击视频页右下角的「映光」，打开环境光。光从开关位置向外扩散，经过的区域逐渐应用效果，视频继续播放。新版边缘加入漫反射，减弱了圆形亮线和页面交界。关闭时，页面沿着光波逐步恢复。

<img src="docs/media/halo-demo.gif" width="100%" alt="展开面板，开启环境光，再关闭并收起面板" />

演示录制于本地动态视频测试页。[视频版](https://elys1an-y1san.github.io/Halo/)画质更清晰。

## 调到你喜欢的亮度

<img src="docs/media/panel.jpg" width="100%" alt="映光控制面板" />

柔和、影院、漫射三种预设，也可以分别调整模糊、扩散和亮度。两个网站独立保存设置，页内面板和工具栏弹窗共用这些设置。

短窗口下，面板可以纵向滚动。开启系统「减少动态效果」后，面板只淡入淡出，环境光直接切换。

<img src="docs/media/wave.jpg" width="100%" alt="漫反射扩散中的环境光" />

## 安装与更新

| 浏览器 | 安装文件 | 操作 |
| :-- | :-- | :-- |
| Windows Chrome | [ZIP 安装包](https://github.com/Elys1an-Y1san/Halo/releases/download/v1.0.5/Halo-Windows-Chrome-1.0.5.zip) | 解压后运行安装器，或按包内说明手动加载 |
| Chrome | [`Chrome/`](Chrome) | 开启开发者模式，加载此文件夹 |
| Safari | [`Safari/Halo.app`](Safari) | 打开应用，在 Safari 设置中启用扩展 |

文件夹内已包含构建产物。Safari 应用使用本地开发签名，首次启用需要开发设置，具体步骤见[安装指南](docs/INSTALL.md)。

在面板底部点击「检查更新」。Safari 发现新版后显示「安装更新」，点击即可启动原生更新器下载、校验签名和安装，完成后刷新视频页。首次从旧版迁移，需要先替换一次应用以获得更新器。Chrome 使用「查看新版」进入发行页，替换文件夹后重新加载扩展。

设置保存在浏览器本地。版本查询不发送浏览网址，也不需要登录。此发行默认关闭崩溃上报。

## 开发

需要 Node.js 22+、Python 3。构建 Safari 应用还需要 macOS、Xcode，以及本机可用的 Apple Development 或 Developer ID Application 签名证书。

```bash
cd Source
./build-chrome.sh    # 生成 ../Chrome
./build-macos.sh     # 同时生成 ../Safari/Halo.app
```

修改共享界面或 B 站适配后，可以复用仓库内的渲染核心：

```bash
cd Source
python3 package-halo.py
python3 tests/ui-fixture/serve.py
```

打开 `http://127.0.0.1:8765/wave.html` 查看演示。测试脚本位于 `Source/tests/`，更新签名步骤见[发布说明](Source/RELEASING.md)。

Windows 安装器源码位于 `Source/Windows/`。在仓库根目录运行 `python3 Source/package-windows.py`，生成安装文件夹和 ZIP。

## 开源致谢

YouTube 渲染核心来自 [Wessel Kroos / youtube-ambilight](https://github.com/WesselKroos/youtube-ambilight/tree/18d17188e5562e5ee913f005192d30c9a60be078) 2.38.17，保留原版权和 MIT 许可。映光添加界面、整页扩散、B 站适配和 Safari 兼容修改。

Safari 更新器使用 [Sparkle](https://github.com/sparkle-project/Sparkle) 2.10.0，其许可保存在 `Source/Native/Frameworks/Sparkle-LICENSE`。

遇到问题时，请在 [Issues](https://github.com/Elys1an-Y1san/Halo/issues) 提供浏览器版本、页面类型和复现步骤。
