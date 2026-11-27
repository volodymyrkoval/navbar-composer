// Loads one local HTML file in the system WebKit at the given viewport width and prints `window.checkResult`.
import WebKit

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let width = Double(CommandLine.arguments[2]) ?? 430
let app = NSApplication.shared
let view = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: 900))

final class Loader: NSObject, WKNavigationDelegate {
	func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
		webView.evaluateJavaScript("window.checkResult") { result, error in
			guard let text = result as? String else {
				FileHandle.standardError.write(Data("no result: \(String(describing: error))\n".utf8))
				exit(1)
			}
			print(text)
			exit(0)
		}
	}
}

let loader = Loader()
view.navigationDelegate = loader
view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
	FileHandle.standardError.write(Data("timed out\n".utf8))
	exit(1)
}
app.run()
