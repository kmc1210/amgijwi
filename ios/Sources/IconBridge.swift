import UIKit
import WebKit

/// 크리스마스 앱 아이콘. 아이콘은 번들에 미리 들어 있고(Assets.xcassets/AppIcon-Xmas, project.yml 의 ALTERNATE_APPICON_NAMES),
/// 언제 묻고 언제 되돌릴지는 웹(www/js/appicon.js)이 정한다. 여기서는 iOS 에 바꿔 달라고 청하고 결과만 알린다.
/// 바꾸면 iOS 가 "아이콘을 변경했습니다" 알림을 띄운다(앱이 막을 수 없다). 앱이 앞에 있을 때만 바꿀 수 있다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiIcon.postMessage("xmas" | "default" | "now")
/// 앱 → 웹: iconFromApp("xmas" | "default" | "fail"). 지금 아이콘은 켤 때 window.__amgijwiIcon 으로 알리고(startScript),
/// 웹이 다시 불리면(웹 프로세스가 내려가 다시 읽을 때) 그 값이 낡았을 수 있어 웹이 "now" 로 한 번 더 묻는다.
final class IconBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. appicon.js 의 iconBridge() 와 같아야 한다.
    static let name = "amgijwiIcon"
    /// 번들 속 크리스마스 아이콘 이름
    private static let xmas = "AppIcon-Xmas"

    private var tell: ((String) -> Void)?

    func attach(tell: @escaping (String) -> Void) {
        self.tell = tell
    }

    /// 지금 아이콘을 웹에 알리는 한 줄. 아이콘을 바꿀 수 없는 기기면 아무것도 넣지 않는다(웹은 묻지도, 칸을 보이지도 않는다).
    static func startScript() -> String {
        guard UIApplication.shared.supportsAlternateIcons else { return "" }
        return " window.__amgijwiIcon = \"\(UIApplication.shared.alternateIconName == xmas ? "xmas" : "default")\";"
    }
}

extension IconBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        /// 앱이 띄운 화면(번들 스킴)에서 온 부탁만 받는다.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == BundleSchemeHandler.scheme,
              let kind = message.body as? String, ["xmas", "default", "now"].contains(kind) else { return }
        let app = UIApplication.shared
        guard app.supportsAlternateIcons else { tell?("typeof iconFromApp === 'function' && iconFromApp(\"fail\")"); return }
        let current = app.alternateIconName == IconBridge.xmas ? "xmas" : "default"
        let want: String? = kind == "xmas" ? IconBridge.xmas : nil
        guard kind != "now", app.alternateIconName != want else {
            tell?("typeof iconFromApp === 'function' && iconFromApp(\"\(current)\")"); return
        }
        app.setAlternateIconName(want) { [weak self] error in
            DispatchQueue.main.async {
                self?.tell?("typeof iconFromApp === 'function' && iconFromApp(\"\(error == nil ? kind : "fail")\")")
            }
        }
    }
}
