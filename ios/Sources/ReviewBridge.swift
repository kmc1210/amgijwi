import UIKit
import WebKit
import StoreKit

/// 별점 요청. 언제 물을지는 웹(www/js/study.js 의 reviewAfterRound)이 정하고,
/// 여기서는 애플이 주는 평가 창을 띄워 달라고 iOS 에 청하기만 한다.
/// 창을 실제로 보여줄지는 iOS 가 정한다(한 해에 세 번까지, 이미 평가한 사람에게는 뜨지 않는다).
/// 그래서 띄웠는지 · 별을 몇 개 줬는지는 앱이 알 수 없고 알리지도 않는다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiReview.postMessage("ask")
final class ReviewBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. study.js 의 reviewBridge() 와 같아야 한다.
    static let name = "amgijwiReview"

    private weak var host: UIViewController?

    func attach(host: UIViewController) {
        self.host = host
    }
}

extension ReviewBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 부탁만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              message.body as? String == "ask",
              let scene = host?.view.window?.windowScene else { return }
        if #available(iOS 16.0, *) {
            AppStore.requestReview(in: scene)
        } else {
            SKStoreReviewController.requestReview(in: scene)
        }
    }
}
