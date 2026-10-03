# 发布 Safari 更新

应用从 `docs/appcast.xml` 读取更新。发行包与 XML 都使用 Ed25519 签名，应用内的 `SUPublicEDKey` 对应这组密钥。私钥不在仓库中；当前维护者的密钥保存在本机钥匙串，账户为 `local.halo.update`。不要重新生成密钥来发布已有用户的更新。

1. 同时增加扩展版本和原生 `MARKETING_VERSION`，增加原生 `CURRENT_PROJECT_VERSION`。运行构建和测试，确认 `Safari/Halo.app` 中的版本一致。原生构建需要 Apple Development 或 Developer ID Application 证书，应用与框架必须使用同一身份；仅做 ad-hoc 签名会被运行时动态库校验拒绝。`build-macos.sh` 会选择本机证书，也可用 `HALO_SIGN_IDENTITY` 指定证书 SHA-1 标识。
2. 从 [Sparkle 官方发行页](https://github.com/sparkle-project/Sparkle/releases/tag/2.10.0) 获取 2.10.0 工具。仓库内框架来自同一发行版。
3. 为原生更新器生成归档。用户首次安装仍可使用仓库内的应用文件夹。

```bash
mkdir -p Source/.build/releases
COPYFILE_DISABLE=1 tar -cJf Source/.build/releases/Halo-Safari-VERSION.tar.xz -C Safari Halo.app
codesign --verify --deep --strict Safari/Halo.app
```

4. 用 SDK 的 `bin/sign_update --account local.halo.update` 签名归档，将返回的 `sparkle:edSignature` 和 `length` 写入 XML 的 `enclosure`。更新下载 URL、两处版本号和最低系统版本。下载 URL 必须指向该版本的公开 Release 资产。
5. 再用同一工具签名 `docs/appcast.xml`。签名后任何 XML 编辑都需要重新签名；`--verify docs/appcast.xml` 可检查签名。
6. 提交并推送，创建对应的正式 Release，上传签名归档。等 Pages 发布完成后，检查公开 XML 和发行资产能否下载，再用带更新器的较低构建执行一次升级。

其他维护者发布独立分支时需要使用自己的密钥、仓库与更新地址。对已有发行换密钥需要先设计迁移，不能只替换公钥。

升级验收应在独立系统用户或虚拟机中执行。不要在日常浏览环境注册同一应用标识的旧版测试副本，否则加载与清理副本可能影响正式扩展的启用状态。


# Firefox 构建与签名

运行 `./build-firefox.sh`，生成根目录 `Firefox/` 和 `Releases/<版本>/Halo-Firefox-<版本>-unsigned.zip`。已有构建产物时可运行 `python3 package-halo.py` 同步所有浏览器包。执行 `node --test tests/*.test.cjs` 和 `python3 tests/package-check.py`，再用 `npx web-ext lint --source-dir ../Firefox` 检查。

使用自己的 Mozilla 开发者账户提交未签名 ZIP，在 AMO 选择“自行分发”以获取签名 XPI，或提交商店审核。首次提交使用 `halo@elys1an-y1san.github.io`，后续版本必须保持该 ID 并递增版本。需要提供可复现构建的源码归档（包括锁文件），不能沿用上游扩展 ID。正式发布前验证签名 XPI 的安装与升级。

当前包声明不收集数据；设置仅保存到本地，崩溃上报关闭，更新查询不传浏览网址。若以后增加遥测，必须重新审查这项声明。官方流程：https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
