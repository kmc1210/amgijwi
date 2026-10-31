import UIKit
import WebKit
import WidgetKit

/// 홈 화면 위젯에 넘길 요약. 무엇을 넘길지는 웹(www/js/widget.js)이 정하고,
/// 여기서는 받은 글(JSON)을 위젯과 같이 쓰는 칸(App Group)에 적고 위젯을 다시 그리게만 한다.
/// 위젯(ios/Widget)은 앱의 저장소를 읽지 못해서 이 칸만 본다. 기기 밖으로 나가는 것은 없다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiWidget.postMessage("<요약 JSON>")
final class WidgetBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. widget.js 의 widgetBridge() 와 같아야 한다.
    static let name = "amgijwiWidget"
    /// 앱과 위젯이 같이 쓰는 칸. project.yml 의 entitlements · Widget/AmgijwiWidget.swift 와 같아야 한다.
    static let group = "group.com.amgijwi.app"
    static let key = "summary"
    /// 요약에는 쥐돌이 그림 다섯 장(수 KB)과, 큰 위젯에 보여줄 레시피 · 메모(레시피 300개면 100KB 남짓)가 들어 있다.
    /// 그보다 한참 큰 것은 받지 않는다.
    private static let limit = 1024 * 1024
}

extension WidgetBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 것만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let text = message.body as? String, text.utf8.count <= WidgetBridge.limit,
              let store = UserDefaults(suiteName: WidgetBridge.group) else { return }
        guard store.string(forKey: WidgetBridge.key) != text else { return }
        store.set(text, forKey: WidgetBridge.key)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

/// 할 일 위젯에서 누른 기록(Widget/TodoWidget.swift 의 TodoLog)을 웹에 넘기고, 웹이 다 받았다고 하면 지운다.
/// 기록은 위젯과 같이 쓰는 칸에 [{id, d, on, at}] 글(JSON)로 쌓여 있다. 앱이 앞으로 나올 때마다 넘긴다(WebAppViewController).
///
/// 앱 → 웹: todoFromWidget(<기록>)   (www/js/todo.js)
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiTodo.postMessage({op: "take", upTo: <ms>})
final class TodoBridge: NSObject {

    static let name = "amgijwiTodo"
    static let key = "todoLog"          // TodoLog.key 와 같아야 한다

    /// 넘길 기록이 있으면 웹에서 돌릴 글. 없으면 nil.
    static func script() -> String? {
        guard let text = UserDefaults(suiteName: WidgetBridge.group)?.string(forKey: key),
              let data = text.data(using: .utf8),
              let list = try? JSONSerialization.jsonObject(with: data) as? [Any], !list.isEmpty,
              let clean = try? JSONSerialization.data(withJSONObject: list),
              let json = String(data: clean, encoding: .utf8) else { return nil }
        return "typeof todoFromWidget === 'function' && todoFromWidget(\(json))"
    }
}

extension TodoBridge: WKScriptMessageHandler {

    /// 웹이 받은 것(누른 때가 upTo 까지인 것)만 지운다. 그사이 위젯에서 또 누른 것은 남는다.
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let body = message.body as? [String: Any], body["op"] as? String == "take",
              let upTo = (body["upTo"] as? NSNumber)?.doubleValue,
              let store = UserDefaults(suiteName: WidgetBridge.group),
              let text = store.string(forKey: TodoBridge.key),
              let data = text.data(using: .utf8),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
        let rest = list.filter { (($0["at"] as? NSNumber)?.doubleValue ?? 0) > upTo }
        if rest.isEmpty {
            store.removeObject(forKey: TodoBridge.key)
        } else if let out = try? JSONSerialization.data(withJSONObject: rest), let s = String(data: out, encoding: .utf8) {
            store.set(s, forKey: TodoBridge.key)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "AmgijwiTodo")
    }
}
