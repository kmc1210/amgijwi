import UIKit
import WebKit
import StoreKit

/// 새 버전 알림. 하루에 한 번(앱을 켜거나 다시 꺼낼 때 — 새 버전이 없다는 답이면 6시간 뒤에 다시) 애플의 앱스토어 검색 주소에 지금 나와 있는 버전만 묻는다.
/// 보내는 것은 앱 번호와 나라(kr)뿐이고, 레시피 · 기록 같은 내용은 보내지 않는다(www/privacy.html 3번).
/// 이 앱보다 새 버전이면 웹(www/js/update.js 의 updateFromApp)에 버전만 알리고, 언제 · 한 번만 물을지는 웹이 정한다.
/// 웹은 받은 버전을 적어 두므로, 묻기 전에 앱이 꺼져도 하루를 기다리지 않고 다음에 켤 때 묻는다.
/// 웹 화면 자체는 여전히 통신하지 못한다(CSP connect-src 'none'). 묻는 것은 여기 앱 쪽이다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiUpdate.postMessage("open") — 앱스토어 페이지를 앱 안에 띄운다.
final class UpdateBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. update.js 의 updateBridge() 와 같아야 한다.
    static let name = "amgijwiUpdate"
    /// 앱스토어의 암기쥐 번호(README 의 App Store 링크와 같다)
    static let appID = "6817266810"
    private static let checkedKey = "updateCheckedAt"
    private static let gap: TimeInterval = 24 * 60 * 60
    /// 앱스토어 답이 "새 버전 없음"이면 6시간 뒤에 다시 묻는다. 출시해도 애플의 검색 정보는 몇 시간 늦게 바뀌어서,
    /// 하루를 꼬박 기다리면 알림이 하루 넘게 늦을 수 있다
    private static let retryGap: TimeInterval = 6 * 60 * 60

    private weak var host: UIViewController?
    private var tell: ((String) -> Void)?
    private var busy = false
    /// 쿠키 · 캐시를 남기지 않는 세션
    private lazy var session = URLSession(configuration: .ephemeral)

    func attach(host: UIViewController, tell: @escaping (String) -> Void) {
        self.host = host
        self.tell = tell
    }

    /// 마지막으로 물은 지 하루가 지났으면 묻는다. 실패하면 적지 않아 다음에 다시 묻는다.
    func checkIfDue() {
        let last = UserDefaults.standard.double(forKey: UpdateBridge.checkedKey)
        let now = Date().timeIntervalSince1970
        guard !busy, now - last >= UpdateBridge.gap || now < last,
              let url = URL(string: "https://itunes.apple.com/lookup?id=\(UpdateBridge.appID)&country=kr") else { return }
        busy = true
        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        req.httpMethod = "GET"
        session.dataTask(with: req) { [weak self] data, _, error in
            let found = (error == nil) ? data.flatMap(UpdateBridge.storeVersion) : nil
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.busy = false
                guard let found = found else { return }
                let mine = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
                let os = UIDevice.current.systemVersion
                /// 새 버전이 없으면 6시간 뒤에 다시(물은 때를 하루 - 6시간 전으로 적는다), 있으면 하루 뒤에
                let isNewer = UpdateBridge.newer(found.version, than: mine)
                UserDefaults.standard.set(isNewer ? now : now - (UpdateBridge.gap - UpdateBridge.retryGap), forKey: UpdateBridge.checkedKey)
                /// 이 기기의 iOS 로 받을 수 없는 버전이면 알리지 않는다
                guard isNewer, !UpdateBridge.newer(found.minOS, than: os) else { return }
                self.tell?("typeof updateFromApp === 'function' && updateFromApp(\"\(found.version)\")")
            }
        }.resume()
    }

    /// 앱스토어 답에서 버전과 최소 iOS 를 꺼낸다. 숫자와 점으로만 된 버전만 받는다(웹으로 그대로 넘기므로).
    private static func storeVersion(_ data: Data) -> (version: String, minOS: String)? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let first = (obj["results"] as? [[String: Any]])?.first,
              let v = first["version"] as? String, v.count <= 16,
              v.range(of: "^[0-9]+(\\.[0-9]+)*$", options: .regularExpression) != nil else { return nil }
        return (v, first["minimumOsVersion"] as? String ?? "0")
    }

    /// "1.10" 은 "1.9" 보다 새것이다. 자리가 모자라면 0 으로 본다("1.3" = "1.3.0").
    static func newer(_ a: String, than b: String) -> Bool {
        let x = a.split(separator: ".").map { Int($0) ?? 0 }, y = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(x.count, y.count) {
            let p = i < x.count ? x[i] : 0, q = i < y.count ? y[i] : 0
            if p != q { return p > q }
        }
        return false
    }

    /// 앱스토어 페이지를 앱 안에 띄운다(거기서 바로 업데이트). 페이지를 다 불러온 뒤에 띄우고,
    /// 못 불러왔거나 이미 다른 창(공유 시트 · 광고)이 떠 있으면 앱스토어 앱으로 넘긴다.
    private func openStore() {
        let store = SKStoreProductViewController()
        store.delegate = self
        store.loadProduct(withParameters: [SKStoreProductParameterITunesItemIdentifier: UpdateBridge.appID]) { [weak self] ok, _ in
            DispatchQueue.main.async {
                guard let host = self?.host else { return }
                if ok, host.presentedViewController == nil {
                    host.present(store, animated: true)
                } else if let url = URL(string: "itms-apps://apps.apple.com/app/id\(UpdateBridge.appID)") {
                    UIApplication.shared.open(url)
                }
            }
        }
    }
}

extension UpdateBridge: SKStoreProductViewControllerDelegate {
    func productViewControllerDidFinish(_ viewController: SKStoreProductViewController) {
        viewController.dismiss(animated: true)
    }
}

extension UpdateBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 부탁만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              message.body as? String == "open" else { return }
        openStore()
    }
}
