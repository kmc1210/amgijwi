import UIKit
import WebKit
import Foundation

/// iCloud 자동 백업. 웹(www/js/icloud.js)이 만든 백업(backupJSON)을 압축해서 사용자 본인의 iCloud 키-값 저장소에 하나 둔다.
/// 같은 Apple 계정이면 새 기기 · 다시 깐 앱에서 꺼낼 수 있다. 개발자 서버를 거치지 않고, 개발자는 볼 수 없다(www/privacy.html 3번).
/// 키-값 저장소는 앱 하나에 1MB 까지라, 압축한 백업이 넘으면 담지 않고 웹에 "너무 크다"고 알린다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiCloud.postMessage({op:"status"} | {op:"save", json, drinks, mastered} | {op:"peek"} | {op:"load"})
/// 앱 → 웹: cloudStatusFromApp · cloudSavedFromApp · cloudFoundFromApp · cloudLoadedFromApp (icloud.js)
final class CloudBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. icloud.js 의 cloudBridge() 와 같아야 한다.
    static let name = "amgijwiCloud"
    private static let dataKey = "backup"
    private static let metaKey = "backupMeta"
    /// 1MB 한도에서 메타 · 여유분을 뺀 크기
    private static let maxBytes = 1_000_000 - 16_000

    private let store = NSUbiquitousKeyValueStore.default
    private var tell: ((String) -> Void)?

    func attach(tell: @escaping (String) -> Void) {
        self.tell = tell
        /// 다른 기기에서 올린 백업이 늦게 내려오면(새로 깐 직후) 웹에 다시 알린다. 되살릴지는 웹이 정한다.
        NotificationCenter.default.addObserver(self, selector: #selector(changedExternally(_:)),
                                               name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }

    private var account: Bool { FileManager.default.ubiquityIdentityToken != nil }

    private var meta: [String: Any]? {
        guard let m = store.dictionary(forKey: CloudBridge.metaKey), m["at"] is String,
              store.data(forKey: CloudBridge.dataKey) != nil else { return nil }
        return m
    }

    @objc private func changedExternally(_ note: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let m = self.meta else { return }
            self.send("cloudFoundFromApp", [m])
        }
    }

    /// JS 함수를 인자와 함께 부른다(인자는 JSON 으로 넘겨 글자가 깨지거나 코드로 읽히지 않게)
    private func send(_ fn: String, _ args: [Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: args),
              let json = String(data: data, encoding: .utf8) else { return }
        tell?("typeof \(fn) === 'function' && \(fn).apply(null, \(json))")
    }

    private func save(_ body: [String: Any]) {
        guard account else { send("cloudSavedFromApp", [false, "noaccount", ""]); return }
        guard let json = body["json"] as? String, let raw = json.data(using: .utf8),
              let packed = try? (raw as NSData).compressed(using: .zlib) as Data else {
            send("cloudSavedFromApp", [false, "fail", ""]); return
        }
        guard packed.count <= CloudBridge.maxBytes else { send("cloudSavedFromApp", [false, "toobig", ""]); return }
        let at = ISO8601DateFormatter().string(from: Date())
        let m: [String: Any] = ["at": at, "drinks": body["drinks"] as? Int ?? 0, "mastered": body["mastered"] as? Int ?? 0,
                                "bytes": packed.count, "v": 1]
        store.set(packed, forKey: CloudBridge.dataKey)
        store.set(m, forKey: CloudBridge.metaKey)
        store.synchronize()
        send("cloudSavedFromApp", [true, "", at])
    }

    private func load() {
        guard let packed = store.data(forKey: CloudBridge.dataKey),
              let raw = try? (packed as NSData).decompressed(using: .zlib) as Data,
              let json = String(data: raw, encoding: .utf8) else {
            send("cloudLoadedFromApp", [NSNull()]); return
        }
        send("cloudLoadedFromApp", [json])
    }
}

extension CloudBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 부탁만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let body = message.body as? [String: Any], let op = body["op"] as? String else { return }
        switch op {
        case "status":
            send("cloudStatusFromApp", [["account": account, "at": meta?["at"] as? String ?? ""]])
        case "save":
            save(body)
        case "peek":
            store.synchronize()
            send("cloudFoundFromApp", [meta ?? NSNull()])
        case "load":
            load()
        default:
            break
        }
    }
}
