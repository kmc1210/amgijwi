import UIKit
import WebKit

/// 진동(햅틱). 언제 · 어떤 느낌으로 울릴지는 웹(www/js/core.js 의 haptic)이 정하고,
/// 여기서는 이름을 받아 iOS 햅틱을 울리기만 한다. 아이폰 설정에서 시스템 햅틱을 끈 사람에게는 iOS 가 알아서 울리지 않는다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiHaptic.postMessage("light" | "soft" | "selection" | "success" | "warning" | "error")
final class HapticBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. core.js 의 haptic() 과 같아야 한다.
    static let name = "amgijwiHaptic"

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let selection = UISelectionFeedbackGenerator()
    private let notice = UINotificationFeedbackGenerator()
}

extension HapticBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let kind = message.body as? String else { return }
        switch kind {
        case "light": light.impactOccurred()
        case "soft": soft.impactOccurred()
        case "selection": selection.selectionChanged()
        case "success": notice.notificationOccurred(.success)
        case "warning": notice.notificationOccurred(.warning)
        case "error": notice.notificationOccurred(.error)
        default: break
        }
    }
}
