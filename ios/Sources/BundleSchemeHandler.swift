import Foundation
import WebKit

/// 앱 안에 넣어둔 www 폴더를 웹뷰에 내려준다.
///
/// file:// 로 띄우지 않고 굳이 스킴을 하나 만드는 이유는 저장소 때문이다.
/// file:// 은 오리진이 제대로 잡히지 않아 localStorage 가 예외를 뱉거나
/// 앱을 껐다 켜면 사라지는 일이 있다. 스킴을 직접 다루면
/// amgijwi://app 이라는 고정된 오리진이 생겨 레시피가 안전하게 남는다.
///
/// index.html 의 <meta> CSP 에 있는 script-src 'self' 도 이 오리진을 가리키게 된다.
/// 그래서 CSP 는 웹에서와 똑같이 동작하며, 여기서 헤더로 또 내려보내지 않는다.
/// 앱에서의 CSP 는 meta 하나로 유지한다는 원칙을 그대로 지킨다.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "amgijwi"
    static let host = "app"
    static var startURL: URL { URL(string: "\(scheme)://\(host)/index.html")! }

    /// 번들 안 www 폴더. 없으면 앱을 띄울 이유가 없으므로 만들 때 걸러낸다.
    private let root: URL

    /// 웹뷰가 취소한 요청에 응답하면 크래시가 난다. 취소된 것을 기억해 둔다.
    private var cancelled = Set<ObjectIdentifier>()

    init?(bundle: Bundle = .main) {
        guard let dir = bundle.url(forResource: "www", withExtension: nil) else { return nil }
        root = dir.standardizedFileURL
    }

    private static let mimeTypes: [String: String] = [
        "html": "text/html; charset=utf-8",
        "js":   "text/javascript; charset=utf-8",
        "css":  "text/css; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "svg":  "image/svg+xml",
        "png":  "image/png",
        "jpg":  "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "ico":  "image/x-icon",
        "woff2": "font/woff2"
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let id = ObjectIdentifier(task)
        cancelled.remove(id)

        guard let url = task.request.url else {
            finish(task, id: id, status: 400, mime: "text/plain", data: Data())
            return
        }

        /// 쿼리는 떼고 본다. style.css?v=13 처럼 캐시 번호가 붙어 오기 때문이다.
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        let target = root.appendingPathComponent(path).standardizedFileURL

        /// ../ 로 번들 바깥을 훔쳐보지 못하게 막는다.
        guard target.path == root.path || target.path.hasPrefix(root.path + "/") else {
            finish(task, id: id, status: 403, mime: "text/plain", data: Data())
            return
        }

        guard let data = try? Data(contentsOf: target) else {
            finish(task, id: id, status: 404, mime: "text/plain", data: Data())
            return
        }

        let ext = target.pathExtension.lowercased()
        let mime = Self.mimeTypes[ext] ?? "application/octet-stream"
        finish(task, id: id, status: 200, mime: mime, data: data)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        cancelled.insert(ObjectIdentifier(task))
    }

    private func finish(_ task: WKURLSchemeTask, id: ObjectIdentifier,
                        status: Int, mime: String, data: Data) {
        guard !cancelled.contains(id), let url = task.request.url else { return }

        /// 앱 안의 파일이라 네트워크를 타지 않는다. 웹뷰가 따로 캐시할 이유가 없다.
        let headers = [
            "Content-Type": mime,
            "Content-Length": String(data.count),
            "Cache-Control": "no-store"
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: status,
                                             httpVersion: "HTTP/1.1", headerFields: headers) else { return }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
        cancelled.remove(id)
    }
}
