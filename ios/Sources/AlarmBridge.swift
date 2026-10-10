import UIKit
import WebKit
import UserNotifications

/// 일정 알림. 무엇을 언제 보낼지와 문구는 웹(www/js/cal.js 의 alarmPlan)이 정하고,
/// 여기서는 받은 목록을 iOS 로컬 알림으로 예약만 한다. 서버는 없다.
///
/// 웹 → 앱: window.webkit.messageHandlers.amgijwiAlarm.postMessage({op: ...})
///   status  권한 상태를 알려 달라
///   ask     권한을 물어 달라 (사용자가 일정 알림을 처음 켤 때만 온다)
///   sync    걸어 둔 것을 모두 지우고 items 로 다시 건다
///           item 에 yearly 가 있으면 해마다 그 월 · 일 · 시각에 되풀이한다(생일 알림 — www/js/birthday.js)
///           item 에 image 가 있으면 번들의 그림을 알림에 붙인다("cake" = birthday-cake.png)
/// 앱 → 웹: alarmStatusFromApp("granted" | "denied" | "unknown")
final class AlarmBridge: NSObject {

    /// 웹이 postMessage 로 부르는 이름. cal.js 의 alarmBridge() 와 같아야 한다.
    static let name = "amgijwiAlarm"
    /// 권한 상태를 웹에 알릴 때 부르는 함수. cal.js 에 있다.
    static let reply = "alarmStatusFromApp"
    /// iOS 가 한 앱에 걸어 두는 로컬 알림 수의 한계. 웹도 이만큼만 보낸다.
    static let limit = 64

    private weak var webView: WKWebView?
    private let center = UNUserNotificationCenter.current()

    override init() {
        super.init()
        /// 앱을 보고 있는 중에 알림 시각이 와도 배너를 띄운다.
        center.delegate = self
        /// 설정 앱에서 알림을 허용하고 돌아오면 웹이 다시 걸 수 있게 알려준다.
        NotificationCenter.default.addObserver(self,
                                               selector: #selector(appBecameActive),
                                               name: UIApplication.didBecomeActiveNotification,
                                               object: nil)
    }

    func attach(_ webView: WKWebView) {
        self.webView = webView
    }

    @objc private func appBecameActive() {
        sendStatus()
    }

    private func sendStatus() {
        center.getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: status = "granted"
            case .denied: status = "denied"
            default: status = "unknown"
            }
            DispatchQueue.main.async {
                /// 페이지가 아직 안 떴으면 함수가 없다. 그때는 웹이 뜬 뒤 status 를 직접 묻는다.
                let js = "typeof \(AlarmBridge.reply) === 'function' && \(AlarmBridge.reply)('\(status)')"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    private func ask() {
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in
            self.sendStatus()
        }
    }

    /// 웹이 보낸 시각은 기기 시간대의 "YYYY-MM-DDTHH:MM" 이다.
    private func schedule(_ items: [[String: Any]]) {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.calendar = Calendar(identifier: .gregorian)
        parser.timeZone = .current
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm"

        /// 웹이 보낸 날짜는 양력이다. 기기 달력이 음력 · 불기여도 양력 월 · 일로 건다
        /// (해마다 되풀이하는 알림이 다른 날로 밀리지 않게).
        var gregorian = Calendar(identifier: .gregorian)
        gregorian.timeZone = .current

        center.removeAllPendingNotificationRequests()
        let now = Date()
        for item in items.prefix(AlarmBridge.limit) {
            guard let id = item["id"] as? String,
                  let at = item["at"] as? String,
                  let date = parser.date(from: at), date > now else { continue }

            let content = UNMutableNotificationContent()
            content.title = item["title"] as? String ?? ""
            content.body = item["body"] as? String ?? ""
            content.sound = .default

            if let image = item["image"] as? String, let attachment = AlarmBridge.attachment(image) {
                content.attachments = [attachment]
            }

            /// 해마다 오는 알림은 연도를 빼고 건다. 앱을 한 해 넘게 열지 않아도 다음 해에 또 온다.
            let yearly = item["yearly"] as? Bool ?? false
            let fields: Set<Calendar.Component> = yearly ? [.month, .day, .hour, .minute]
                                                         : [.year, .month, .day, .hour, .minute]
            var parts = gregorian.dateComponents(fields, from: date)
            parts.calendar = gregorian
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: yearly)
            center.add(UNNotificationRequest(identifier: "ev-" + id, content: content, trigger: trigger))
        }
    }

    /// 알림에 붙일 그림. 웹은 이름만 보내고, 붙일 수 있는 그림은 번들에 든 것으로 정해져 있다.
    /// iOS 는 붙인 파일을 알림 저장소로 옮겨 가므로 번들 파일을 임시 폴더에 복사해 넘긴다.
    private static let images = ["cake": "birthday-cake"]

    private static func attachment(_ name: String) -> UNNotificationAttachment? {
        guard let file = images[name],
              let source = Bundle.main.url(forResource: file, withExtension: "png") else { return nil }
        let copy = FileManager.default.temporaryDirectory
            .appendingPathComponent(file + "-" + UUID().uuidString + ".png")
        do {
            try FileManager.default.copyItem(at: source, to: copy)
            return try UNNotificationAttachment(identifier: name, url: copy)
        } catch {
            try? FileManager.default.removeItem(at: copy)
            return nil
        }
    }
}

extension AlarmBridge: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let op = body["op"] as? String else { return }
        switch op {
        case "status": sendStatus()
        case "ask": ask()
        case "sync": schedule(body["items"] as? [[String: Any]] ?? [])
        default: break
        }
    }
}

extension AlarmBridge: UNUserNotificationCenterDelegate {

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }
}
