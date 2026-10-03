# Firefox 适配验证 · 2026-10-03

［COMPUTED · HIGH］产物：`Firefox/` 与 `Releases/1.0.6/Halo-Firefox-1.0.6-unsigned.zip`。最低桌面浏览器版本 128，使用独立扩展 ID、后台脚本和共享页面通信桥接；不申请原生消息权限。

［COMPUTED · HIGH］已执行：

- `npm ci --ignore-scripts`、`npm run build`、`python3 package-halo.py` 成功。
- `node --test tests/*.test.cjs`：37/37 通过。
- `python3 tests/package-check.py`：全部资源存在、共享文件一致、版本一致，ZIP 与目录逐字节一致。
- `node tests/render-regression.cjs`：通过。
- `web-ext 10.7.0 lint`：0 错误、4 警告。两项版本警告来自 Firefox 140 / Android 142 才识别的数据声明；另外两项是固定本地界面模板的 innerHTML 赋值，不包含页面提供的字符串。没有为消除警告而扩大权限或忽略检查。
- 源码改动空白检查通过；首次暂存新生成的浏览器目录时，共享渲染构建产物出现上游已有的行尾空白提示，保留原字节以维持各浏览器资源一致。

［COMPUTED · HIGH］运行验证未完成：下载的桌面 Firefox 157.0 在独立测试配置启动时退出，报告 `sandbox_extension_issue_file_to_process failed` / `Could not find profile folder`。缓存的自动化 Firefox 也未完成启动。没有取得真实扩展加载、设置保存、视频渲染或站内导航通过证据。静态与单元测试不能代替这些验收。

［KNOWN · HIGH］未签名包通过 `about:debugging#/runtime/this-firefox` 临时加载；永久安装需要签名 XPI。当前没有签名产物，也没有发布到商店。官方说明：https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/

后续运行验收：

```bash
cd Source
# 安装独立测试依赖（不改项目锁文件）
npm install --prefix .build/firefox-tools selenium-webdriver geckodriver playwright
# 替换为本机 Firefox 可执行文件；脚本使用独立临时配置
NODE_PATH="$PWD/.build/firefox-tools/node_modules" HALO_FIREFOX_BINARY=/path/to/firefox node tests/firefox-runtime.cjs
NODE_PATH="$PWD/.build/firefox-tools/node_modules" .build/firefox-tools/node_modules/.bin/playwright install firefox
# 本地交互场景（需先运行 python3 tests/ui-fixture/serve.py）
NODE_PATH="$PWD/.build/firefox-tools/node_modules" HALO_BROWSER=firefox node tests/browser-check.cjs .build/firefox-fixtures.json
```

［COMPUTED · HIGH］ZIP SHA-256：`c3bdc60b6b8a5dfdb93aa4163dccb257ce0590c7564c95042ceaa401fca55ed0`。
