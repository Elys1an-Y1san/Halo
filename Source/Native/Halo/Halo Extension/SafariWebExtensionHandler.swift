import SafariServices
import AppKit

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any]
        func finish(_ value: [String: Any]) {
            let response = NSExtensionItem()
            response.userInfo = [SFExtensionMessageKey: value]
            context.completeRequest(returningItems: [response])
        }
        guard let type = message?["type"] as? String else { finish(["ok": false]); return }
        if type == "halo-update-info" { finish(["ok": true, "supported": true]); return }
        guard type == "halo-install-update" else { finish(["ok": false]); return }
        // Only the containing app and a fixed command can be launched, never a page-supplied path.
        let app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        DispatchQueue.main.async {
            NSWorkspace.shared.open([URL(string: "halo-update://install")!], withApplicationAt: app, configuration: NSWorkspace.OpenConfiguration()) { _, error in
                finish(["ok": error == nil, "code": error == nil ? "started" : "native_failed"])
            }
        }
    }
}
