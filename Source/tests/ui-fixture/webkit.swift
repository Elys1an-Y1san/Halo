import Cocoa
import WebKit
let application = NSApplication.shared
application.setActivationPolicy(.prohibited)
final class Probe: NSObject, WKNavigationDelegate {
    let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 400, height: 300))
    func run() { web.navigationDelegate = self; web.load(URLRequest(url: URL(string:"http://127.0.0.1:8777/test.html")!)) }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline:.now()+4) {
          self.web.evaluateJavaScript("document.body.dataset.testResults") { result,error in
            guard let result=result as? String else {print("FAIL: no test results",error as Any);exit(1)}
            print(result);exit(result.contains("false") ? 1:0)
          }
        }
    }
}
let probe = Probe(); probe.run()
DispatchQueue.main.asyncAfter(deadline: .now()+20) { print("timeout"); exit(2) }
RunLoop.main.run()
