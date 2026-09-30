import Foundation
import WebKit

/// 앱 쪽 사본. 레시피는 웹뷰 저장소(localStorage)에 있는데, iOS 가 오래 안 쓴 앱의 웹뷰 저장소를 비울 수 있다.
/// 그래서 웹이 저장할 때마다 같은 내용을 받아 앱 저장 공간(Application Support)에 한 벌 더 써 둔다.
/// Application Support 는 기기 백업(iCloud · 컴퓨터)에도 들어간다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiStore.postMessage({op: "save", text})
/// 앱 → 웹: 켤 때 문서가 뜨기 전에 window.__amgijwiNativeCopy = "<사본 JSON 문자열>" 을 넣는다.
///          웹(core.js)은 웹뷰 저장소가 비었을 때만 이걸로 되살린다.
final class StoreBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. core.js 의 storeBridge() 와 같아야 한다.
    static let name = "amgijwiStore"
    /// 사본이 이보다 크면 뭔가 잘못된 것이다. 레시피 수백 개도 1MB 가 안 된다.
    static let maxBytes = 20 * 1024 * 1024

    private static var fileURL: URL? {
        let fm = FileManager.default
        guard let base = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        let dir = base.appendingPathComponent("amgijwi", isDirectory: true)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("data-copy.json")
    }

    /// 켤 때 넣을 스크립트. 사본이 없으면 nil.
    /// 사본 글자를 JS 문자열로 안전하게 감싸려고 JSON 인코더를 쓴다(따옴표 · 줄바꿈 이스케이프).
    static func startupScript() -> WKUserScript? {
        guard let url = fileURL,
              let text = try? String(contentsOf: url, encoding: .utf8), !text.isEmpty,
              let literal = try? JSONSerialization.data(withJSONObject: text, options: [.fragmentsAllowed]),
              let js = String(data: literal, encoding: .utf8) else { return nil }
        return WKUserScript(source: "window.__amgijwiNativeCopy = \(js);",
                            injectionTime: .atDocumentStart,
                            forMainFrameOnly: true)
    }

    /// 파일을 통째로 새로 쓴다(atomic). 쓰다가 앱이 꺼져도 반쯤 쓴 파일이 남지 않는다.
    private func save(_ text: String) {
        guard let url = StoreBridge.fileURL,
              let bytes = text.data(using: .utf8),
              !bytes.isEmpty, bytes.count <= StoreBridge.maxBytes else { return }
        /// 레시피 목록이 있는 JSON 인지만 확인한다. 깨진 내용으로 멀쩡한 사본을 덮어쓰지 않게.
        guard let obj = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              obj["drinks"] is [Any] else { return }
        try? bytes.write(to: url, options: [.atomic])
    }
}

extension StoreBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 우리 페이지(amgijwi://)의 본문 프레임이 보낸 것만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let body = message.body as? [String: Any],
              body["op"] as? String == "save",
              let text = body["text"] as? String else { return }
        save(text)
    }
}
