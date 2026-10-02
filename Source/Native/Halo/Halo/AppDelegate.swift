import Cocoa
import Sparkle

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    private let driver = HaloUpdateDriver()
    private var updater: SPUUpdater?
    private var pending = false
    func applicationDidFinishLaunching(_ notification: Notification) {
        let updater = SPUUpdater(hostBundle: .main, applicationBundle: .main, userDriver: driver, delegate: nil)
        self.updater = updater
        do { try updater.start() } catch { driver.status("更新器启动失败：\(error.localizedDescription)") }
        if pending { install() }
    }
    func application(_ application: NSApplication, open urls: [URL]) {
        guard urls.contains(where: {$0.scheme == "halo-update" && $0.host == "install"}) else { return }
        pending = true
        if updater != nil { install() }
    }
    private func install() {
        pending = false
        guard let updater, !updater.sessionInProgress else { driver.showUpdateInFocus(); return }
        driver.status("正在查询更新…")
        updater.checkForUpdates()
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { !(updater?.sessionInProgress ?? false) }
}

// A visible progress window accompanies the user-initiated action in the browser panel.
// Sparkle retains archive/feed verification, sandboxed installation and rollback behavior.
@MainActor
final class HaloUpdateDriver: NSObject, SPUUserDriver {
    private var window: NSWindow?
    private let label = NSTextField(wrappingLabelWithString: "")
    private var cancellation: (() -> Void)?
    private let cancelButton = NSButton(title: "取消", target: nil, action: nil)
    private var expected: UInt64 = 0, received: UInt64 = 0
    func status(_ text: String) {
        if window == nil {
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 460, height: 180), styleMask: [.titled,.closable], backing: .buffered, defer: false)
            w.title = "映光更新";w.center();w.isReleasedWhenClosed = false
            let title = NSTextField(labelWithString: "更新映光 Halo")
            title.font = .systemFont(ofSize: 23, weight: .medium);title.frame = NSRect(x: 28, y: 112, width: 404, height: 34)
            label.frame = NSRect(x: 28, y: 38, width: 404, height: 60);label.font = .systemFont(ofSize: 14)
            cancelButton.target = self;cancelButton.action = #selector(cancelUpdate);cancelButton.frame = NSRect(x: 344,y: 12,width: 88,height: 28)
            w.contentView?.addSubview(title);w.contentView?.addSubview(label);w.contentView?.addSubview(cancelButton);window = w
            w.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps: true)
        }
        label.stringValue = text;cancelButton.isEnabled = cancellation != nil
    }
    @objc private func cancelUpdate() { cancellation?();cancellation = nil;status("已取消更新") }
    func show(_ request: SPUUpdatePermissionRequest, reply: @escaping (SUUpdatePermissionResponse)->Void) { reply(SUUpdatePermissionResponse(automaticUpdateChecks: false, sendSystemProfile: false)) }
    func showUserInitiatedUpdateCheck(cancellation: @escaping ()->Void) { self.cancellation = cancellation;status("正在查询更新…") }
    func showUpdateFound(with appcastItem: SUAppcastItem, state: SPUUserUpdateState, reply: @escaping (SPUUserUpdateChoice)->Void) {
        guard !appcastItem.isInformationOnlyUpdate else { status("此版本需要从发行页安装");reply(.dismiss);return }
        status("正在下载 \(appcastItem.displayVersionString)…");reply(.install)
    }
    func showUpdateReleaseNotes(with downloadData: SPUDownloadData) {}
    func showUpdateReleaseNotesFailedToDownloadWithError(_ error: Error) {}
    func showUpdateNotFoundWithError(_ error: Error, acknowledgement: @escaping ()->Void) { cancellation = nil;status("已是最新版本");acknowledgement() }
    func showUpdaterError(_ error: Error, acknowledgement: @escaping ()->Void) { cancellation = nil;status("更新失败：\(error.localizedDescription)");acknowledgement() }
    func showDownloadInitiated(cancellation: @escaping ()->Void) { self.cancellation = cancellation;expected = 0;received = 0;status("正在下载更新…") }
    func showDownloadDidReceiveExpectedContentLength(_ expectedContentLength: UInt64) { expected = expectedContentLength }
    func showDownloadDidReceiveData(ofLength length: UInt64) { received += length;if expected > 0 { status("正在下载 \(min(100,received*100/expected))%") } }
    func showDownloadDidStartExtractingUpdate() { cancellation = nil;status("正在校验签名并解包…") }
    func showExtractionReceivedProgress(_ progress: Double) { status("正在解包 \(Int(progress*100))%") }
    func showReady(toInstallAndRelaunch reply: @escaping (SPUUserUpdateChoice)->Void) { status("正在安装，完成后刷新视频页");reply(.install) }
    func showInstallingUpdate(withApplicationTerminated applicationTerminated: Bool, retryTerminatingApplication: @escaping ()->Void) { status("正在安装更新…") }
    func showUpdateInstalledAndRelaunched(_ relaunched: Bool, acknowledgement: @escaping ()->Void) { status("更新已完成，请刷新视频页");acknowledgement() }
    func dismissUpdateInstallation() {}
    func showUpdateInFocus() { window?.makeKeyAndOrderFront(nil) }
}
