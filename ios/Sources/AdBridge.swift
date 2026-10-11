import UIKit
import WebKit
import GoogleMobileAds

/// 보상형 광고. 사용자가 옷장에서 "광고 보고 치즈 받기"를 누를 때만 움직인다.
/// 언제 보여줄지 · 하루 몇 번 · 치즈를 몇 개 줄지는 웹(www/js/ads.js)이 정하고,
/// 여기서는 광고를 불러와 띄우고 "끝까지 봤는지"만 알려준다.
///
/// 이 앱에서 기기 밖으로 통신하는 것은 이 광고뿐이다. 그래서
///   · 앱을 켤 때는 광고 SDK 를 깨우지 않는다. 광고 버튼을 처음 누를 때 깨운다.
///   · 맞춤형이 아닌 광고만 청한다(npa=1). 추적 허용 창(ATT)을 띄우지 않고 광고 식별자도 쓰지 않는다.
///   · 레시피 · 학습 기록 같은 앱 데이터는 광고 쪽에 넘기지 않는다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiAd.postMessage({op: "show"})
/// 앱 → 웹: adResultFromApp("rewarded" | "closed" | "failed")
///   rewarded  끝까지 봤다(보상 조건을 채웠다)
///   closed    중간에 닫았다
///   failed    광고가 없거나 불러오지 못했다(통신이 안 될 때 포함)
final class AdBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. ads.js 의 adBridge() 와 같아야 한다.
    static let name = "amgijwiAd"
    /// 결과를 웹에 알릴 때 부르는 함수. ads.js 에 있다.
    static let reply = "adResultFromApp"

    /// 구글이 공개해 둔 시험용 보상형 광고 단위. 개발 빌드는 늘 이것을 쓴다
    /// (개발 중에 진짜 광고를 띄우면 무효 트래픽으로 계정이 막힐 수 있다).
    private static let testUnit = "ca-app-pub-3940256099942544/1712485313"

    /// 광고 단위 ID. Info.plist 의 AmgijwiRewardedUnit(project.yml)에 적는다. 비어 있으면 출시 빌드에서 광고 기능 전체가 꺼진다.
    private static var unit: String {
        let real = (Bundle.main.object(forInfoDictionaryKey: "AmgijwiRewardedUnit") as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
        #if DEBUG
        return testUnit
        #else
        return real
        #endif
    }

    /// 광고를 켤지. AmgijwiAdsEnabled 를 false 로 두거나 광고 단위를 비우면 웹에 광고 버튼이 나오지 않는다.
    static var enabled: Bool {
        (Bundle.main.object(forInfoDictionaryKey: "AmgijwiAdsEnabled") as? Bool ?? false) && !unit.isEmpty
    }

    private weak var webView: WKWebView?
    private weak var host: UIViewController?
    private var started = false
    private var busy = false
    private var earned = false
    private var ad: RewardedAd?

    func attach(_ webView: WKWebView, host: UIViewController) {
        self.webView = webView
        self.host = host
    }

    private func send(_ result: String) {
        busy = false
        ad = nil
        let js = "typeof \(AdBridge.reply) === 'function' && \(AdBridge.reply)('\(result)')"
        DispatchQueue.main.async { self.webView?.evaluateJavaScript(js, completionHandler: nil) }
    }

    private func show() {
        guard AdBridge.enabled, !busy else { return }
        busy = true
        earned = false
        if started {
            load()
        } else {
            /// 광고 SDK 는 여기서 처음 깨어난다.
            MobileAds.shared.start { [weak self] _ in
                DispatchQueue.main.async {
                    self?.started = true
                    self?.load()
                }
            }
        }
    }

    private func load() {
        let request = Request()
        let extras = Extras()
        extras.additionalParameters = ["npa": "1"]      // 맞춤형이 아닌 광고만
        request.register(extras)
        RewardedAd.load(with: AdBridge.unit, request: request) { [weak self] ad, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard let ad = ad, error == nil, let host = self.host else {
                    self.send("failed")
                    return
                }
                self.ad = ad
                ad.fullScreenContentDelegate = self
                ad.present(from: host) { [weak self] in
                    self?.earned = true
                }
            }
        }
    }
}

extension AdBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 부탁만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let body = message.body as? [String: Any],
              body["op"] as? String == "show" else { return }
        show()
    }
}

extension AdBridge: FullScreenContentDelegate {

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        send(earned ? "rewarded" : "closed")
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        send("failed")
    }
}
