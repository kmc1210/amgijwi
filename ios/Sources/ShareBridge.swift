import UIKit
import WebKit

/// 백업 파일 내보내기. 웹뷰는 웹의 <a download> 를 받지 못한다(바깥 주소로 보고 막는다).
/// 그래서 웹이 파일 이름과 내용을 넘기면 여기서 임시 파일로 만들어 iOS 공유 시트를 띄운다.
/// "파일에 저장" · AirDrop · 메일 · 메신저 중 어디로 보낼지는 사용자가 고른다. 서버는 거치지 않는다.
///
/// 레시피 보내기(www/js/recipeshare.js)도 같은 통로를 쓴다. 그때는 kind: "recipes" 와, 파일과 같이 갈 한 줄(note — 앱스토어 주소)을 넘긴다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiShare.postMessage({name, text, kind?, note?})
/// 앱 → 웹: shareDoneFromApp(true | false, kind)   어딘가로 보냈으면 true, 닫거나 실패하면 false
final class ShareBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. settings.js 의 shareBridge() 와 같아야 한다.
    static let name = "amgijwiShare"
    /// 결과를 웹에 알릴 때 부르는 함수. settings.js 에 있다.
    static let reply = "shareDoneFromApp"

    private weak var webView: WKWebView?
    private weak var host: UIViewController?

    func attach(_ webView: WKWebView, host: UIViewController) {
        self.webView = webView
        self.host = host
    }

    private func present(name raw: String, text: String, kind: String, note: String?) {
        guard let host = host else { done(false, kind); return }

        /// 이름에 경로가 섞여 와도 임시 폴더 밖으로 나가지 않게 마지막 조각만 쓴다.
        let last = (raw as NSString).lastPathComponent
        let name = last.isEmpty ? "amgijwi-backup.json" : last

        /// 지난번에 만든 파일은 지우고 새로 만든다. 백업이 임시 폴더에 쌓이지 않게 한다.
        let fm = FileManager.default
        let dir = fm.temporaryDirectory.appendingPathComponent("share", isDirectory: true)
        try? fm.removeItem(at: dir)
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
            let url = dir.appendingPathComponent(name)
            try text.write(to: url, atomically: true, encoding: .utf8)

            /// 한 줄은 메신저 · 메일에만 붙인다. 파일에 저장 · 에어드롭에 붙으면 글 파일이 하나 더 생긴다
            var items: [Any] = [url]
            if let note = note, !note.isEmpty { items.append(ShareNote(note)) }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            /// 아이패드는 공유 시트를 말풍선으로 띄운다. 기준 자리를 안 주면 앱이 멈춘다.
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = host.view
                pop.sourceRect = CGRect(x: host.view.bounds.midX, y: host.view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { [weak self] _, completed, _, _ in
                self?.done(completed, kind)
            }
            host.present(sheet, animated: true)
        } catch {
            done(false, kind)
        }
    }

    private func done(_ ok: Bool, _ kind: String) {
        let safeKind = kind.filter { $0.isLetter }          // 웹이 보낸 값 그대로 JS 에 넣지 않는다
        DispatchQueue.main.async {
            let js = "typeof \(ShareBridge.reply) === 'function' && \(ShareBridge.reply)(\(ok ? "true" : "false"), '\(safeKind)')"
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

extension ShareBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let text = body["text"] as? String else { return }
        present(name: body["name"] as? String ?? "", text: text,
                kind: body["kind"] as? String ?? "", note: body["note"] as? String)
    }
}

/// 공유 시트에 파일과 같이 넣는 한 줄. 메시지 · 메일 · 메신저에는 붙고, 파일에 저장 · 에어드롭 · 복사에는 붙이지 않는다.
final class ShareNote: NSObject, UIActivityItemSource {
    private let text: String
    init(_ text: String) { self.text = text }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any { text }

    func activityViewController(_ activityViewController: UIActivityViewController,
                                itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        guard let type = activityType else { return text }
        if type == .airDrop || type == .copyToPasteboard || type.rawValue.contains("SaveToFiles") || type.rawValue.contains("DocumentManager") {
            return nil
        }
        return text
    }
}
