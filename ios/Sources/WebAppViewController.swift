import UIKit
import WebKit
import AVFoundation
import CoreHaptics

/// 화면 전체를 덮는 웹뷰 하나가 앱의 전부다.
final class WebAppViewController: UIViewController {

    private var webView: WKWebView!
    /// 첫 화면이 다 떴는가 · 그 전에 위젯을 눌러 들어온 것(뜬 뒤에 웹에 알린다)
    private var pageReady = false
    private var pendingJS: [String] = []
    private let handler: BundleSchemeHandler?
    private let alarms = AlarmBridge()
    private let share = ShareBridge()
    private let haptics = HapticBridge()
    private let ads = AdBridge()
    private let review = ReviewBridge()
    private let widget = WidgetBridge()
    private let store = StoreBridge()
    private let update = UpdateBridge()
    private let cloud = CloudBridge()
    private let icons = IconBridge()

    init() {
        handler = BundleSchemeHandler()
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("스토리보드를 쓰지 않는다") }

    override func loadView() {
        let config = WKWebViewConfiguration()

        /// 기본 저장소는 디스크에 남는다. localStorage 가 앱을 껐다 켜도 살아있는 근거다.
        config.websiteDataStore = .default()

        if let handler = handler {
            config.setURLSchemeHandler(handler, forURLScheme: BundleSchemeHandler.scheme)
        }

        /// 소리가 전체 화면으로 튀지 않고, 첫 제스처 전에 막히지도 않게 한다.
        /// 배경음을 실제로 켜는 시점은 웹 쪽 armBgm 이 정한다.
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        /// 웹 앱이 "홈 화면에 추가하세요" 를 앱 안에서 띄우지 않도록 알려준다.
        /// 웹뷰에서는 display-mode: standalone 도 navigator.standalone 도 잡히지 않는다.
        /// 같은 때에 도트 화면(www/dot.css) 표시도 붙인다. 문서가 그려지기 전이라 웹 모습이 잠깐 비치지 않는다.
        /// 진동이 되는 기기인지(아이패드는 진동 장치가 없다)와, 건의 메일에 붙일 앱 · 기기 정보도 같이 알린다.
        let flag = WKUserScript(source: "window.__amgijwiNative = true; document.documentElement.classList.add('dot');"
                                    + WebAppViewController.deviceScript(),
                                injectionTime: .atDocumentStart,
                                forMainFrameOnly: true)
        config.userContentController.addUserScript(flag)

        /// 앱 쪽 사본. 웹뷰 저장소가 비었을 때 되살릴 수 있게 켤 때 넣어 두고, 저장할 때마다 받아 둔다 (StoreBridge.swift).
        if let copy = StoreBridge.startupScript() {
            config.userContentController.addUserScript(copy)
        }
        config.userContentController.add(store, name: StoreBridge.name)

        /// 일정 알림 통로. 무엇을 언제 보낼지는 웹이 정하고 여기서는 예약만 한다 (AlarmBridge.swift).
        config.userContentController.add(alarms, name: AlarmBridge.name)

        /// 백업 파일 내보내기 통로. 웹뷰는 파일 내려받기를 못 받아서 공유 시트로 내보낸다 (ShareBridge.swift).
        config.userContentController.add(share, name: ShareBridge.name)

        /// 진동 통로. 웹이 느낌 이름만 넘긴다 (HapticBridge.swift).
        config.userContentController.add(haptics, name: HapticBridge.name)

        /// 보상형 광고 통로. 옷장 · 학습 결과 화면에서 광고 버튼을 누를 때만 쓴다 (AdBridge.swift).
        config.userContentController.add(ads, name: AdBridge.name)

        /// 별점 요청 통로. 전부 외운 바퀴 뒤에 가끔 애플의 평가 창을 청한다 (ReviewBridge.swift).
        config.userContentController.add(review, name: ReviewBridge.name)

        /// 홈 화면 위젯에 넘길 요약 통로. 받은 것을 위젯과 같이 쓰는 칸에 적는다 (WidgetBridge.swift).
        config.userContentController.add(widget, name: WidgetBridge.name)

        /// 새 버전 알림 통로. 6시간에 한 번 정도 앱스토어에 버전만 묻고, 새것이면 웹이 홈에서 한 번 묻는다 (UpdateBridge.swift).
        config.userContentController.add(update, name: UpdateBridge.name)

        /// iCloud 자동 백업 통로. 웹이 만든 백업을 사용자 본인 iCloud 키-값 저장소에 둔다 (CloudBridge.swift).
        config.userContentController.add(cloud, name: CloudBridge.name)

        /// 크리스마스 앱 아이콘 통로. 12월에 웹이 묻고, 고르면 iOS 에 바꿔 달라고 청한다 (IconBridge.swift).
        config.userContentController.add(icons, name: IconBridge.name)

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        alarms.attach(webView)
        ads.attach(webView, host: self)
        review.attach(host: self)
        share.attach(webView, host: self)
        update.attach(host: self) { [weak self] js in self?.tell(js) }
        cloud.attach { [weak self] js in self?.tell(js) }
        icons.attach { [weak self] js in self?.tell(js) }

        /// 안전 영역까지 페이지가 직접 그린다. index.html 의 viewport-fit=cover 와 짝이다.
        /// 여기서 여백을 자동으로 넣어버리면 노치 대응 CSS 와 이중으로 겹친다.
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        /// 학습 카드가 위아래로 출렁이면 앱 같지 않다.
        webView.scrollView.bounces = false

        /// 뒤로 쓸어넘기면 앱이 빈 화면이 된다. 화면 이동은 앱이 알아서 한다.
        webView.allowsBackForwardNavigationGestures = false

        /// 링크를 길게 누르면 사파리 미리보기가 뜬다. 앱 안에서 웹 페이지처럼 보이는 순간이라 끈다.
        webView.allowsLinkPreview = false

        /// 페이지 배경이 그대로 보이게 둔다. 테마를 바꿔도 가장자리가 따로 놀지 않는다.
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        configureAudioSession()

        guard handler != nil else {
            showMissingBundleNotice()
            return
        }
        webView.load(URLRequest(url: BundleSchemeHandler.startURL))
        /// 켤 때와 다시 앞으로 꺼낼 때 새 버전을 확인한다(물을 때가 된 때만 실제로 묻는다 — UpdateBridge.swift)
        NotificationCenter.default.addObserver(self, selector: #selector(becameActive),
                                               name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func becameActive() { update.checkIfDue() }

    /// window.__amgijwiHaptics: 진동을 낼 수 있는 기기인지. 아니면 설정의 진동 칸을 숨긴다.
    /// window.__amgijwiInfo: 건의 메일 본문에 붙이는 앱 버전 · 기기 · iOS 버전. 메일은 사용자가 직접 보낸다.
    /// window.__amgijwiIcon: 지금 홈 화면 아이콘("default" · "xmas"). 바꿀 수 없는 기기면 없다 (IconBridge.swift).
    private static func deviceScript() -> String {
        var haptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
        #if targetEnvironment(simulator)
        /// 시뮬레이터는 늘 "진동 없음" 이라, 아이폰 시뮬레이터에서도 진동 칸이 사라져 실기기와 달라진다
        haptics = UIDevice.current.userInterfaceIdiom == .phone
        #endif
        let b = Bundle.main.infoDictionary ?? [:]
        let ver = (b["CFBundleShortVersionString"] as? String ?? "?") + " (" + (b["CFBundleVersion"] as? String ?? "?") + ")"
        let info: [String: String] = ["app": ver, "device": UIDevice.current.model + " (" + machineName() + ")", "os": "iOS " + UIDevice.current.systemVersion]
        let json = (try? JSONSerialization.data(withJSONObject: info)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        /// 진동이 안 되는 기기는 문서가 그려지기 전에 표시를 붙여 CSS 가 진동 칸을 숨긴다(dot.css html.dot.nohaptic)
        /// 광고가 켜진 빌드인지도 알린다. 꺼져 있으면 웹은 광고 버튼을 그리지 않는다(ads.js).
        return " window.__amgijwiHaptics = \(haptics ? "true" : "false"); window.__amgijwiInfo = \(json);"
             + " window.__amgijwiAds = \(AdBridge.enabled ? "true" : "false");"
             + IconBridge.startScript()
             + (haptics ? "" : " document.documentElement.classList.add('nohaptic');")
    }

    /// "iPhone17,3" 같은 기종 이름. UIDevice.model 은 "iPhone" · "iPad" 뿐이라 화면 크기를 알 수 없다.
    private static func machineName() -> String {
        #if targetEnvironment(simulator)
        if let m = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return m }
        #endif
        var u = utsname()
        uname(&u)
        return withUnsafePointer(to: &u.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
        }
    }

    /// ambient 를 쓰면 무음 스위치를 따르고, 듣고 있던 음악도 끊지 않는다.
    /// 공부하면서 켜두는 앱이라 남의 소리를 뺏지 않는 편이 맞다.
    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [])
        try? session.setActive(true)
    }

    /// www 폴더가 번들에 안 들어간 경우. 빈 화면만 뜨면 원인을 찾기 어렵다.
    private func showMissingBundleNotice() {
        let label = UILabel()
        label.text = "앱 안에 웹 파일이 없습니다.\nwww 폴더가 번들에 포함됐는지 확인하세요."
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemBackground
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24)
        ])
    }
}

extension WebAppViewController: WKNavigationDelegate {

    /// 위젯을 눌러 들어왔을 때(Widget/AmgijwiWidget.swift 의 WidgetLink). "amgijwi-widget://recipe?id=…" · "…://memo" · "…://cal".
    /// 웹(www/js/widget.js 의 widgetOpenFromApp)에 어느 화면인지만 알린다. 페이지가 아직 안 떴으면 뜬 뒤에 알린다.
    /// 그 밖의 주소는 받지 않는다.
    func openWidget(_ url: URL) {
        guard url.scheme == "amgijwi-widget", let kind = url.host, ["recipe", "memo", "cal"].contains(kind) else { return }
        let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "id" })?.value ?? ""
        guard let data = try? JSONSerialization.data(withJSONObject: [kind, String(id.prefix(64))]),
              let args = String(data: data, encoding: .utf8) else { return }
        let js = "typeof widgetOpenFromApp === 'function' && widgetOpenFromApp.apply(null, \(args))"
        tell(js)
    }

    /// 받은 레시피 파일(.amgijwi — 다른 앱에서 "암기쥐에서 열기"). 내용만 읽어 웹(www/js/recipeshare.js 의 recipesFromApp)에 넘기고,
    /// iOS 가 앱 안(Inbox)으로 복사해 둔 파일은 지운다. 고르고 들이는 일은 웹이 한다. 너무 큰 파일(2MB 넘게)은 받지 않는다.
    func openRecipeFile(_ url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer {
            if scoped { url.stopAccessingSecurityScopedResource() }
            if url.path.contains("/Inbox/") { try? FileManager.default.removeItem(at: url) }
        }
        /// 너무 크거나 읽지 못하면 빈 내용을 넘긴다 — 웹이 "레시피 파일이 아니에요"라고 알린다(아무 일 없이 끝나지 않게)
        var text = ""
        if let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize, size <= 2_000_000,
           let data = try? Data(contentsOf: url), let s = String(data: data, encoding: .utf8) {
            text = s
        }
        guard let arg = try? JSONSerialization.data(withJSONObject: [text]),
              let args = String(data: arg, encoding: .utf8) else { return }
        tell("typeof recipesFromApp === 'function' && recipesFromApp.apply(null, \(args))")
    }

    /// 웹에 알린다. 첫 화면이 아직 안 떴으면 뜬 뒤에 차례대로 알린다.
    private func tell(_ js: String) {
        if pageReady { webView.evaluateJavaScript(js, completionHandler: nil) } else { pendingJS.append(js) }
    }

    /// 오래 뒤에 두면 iOS 가 웹 화면을 내릴 때가 있다(빈 화면이 된다). 다시 불러오고, 그사이 위젯을 눌렀으면 뜬 뒤에 알린다.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        pageReady = false
        webView.reload()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pageReady = true
        let waiting = pendingJS
        pendingJS = []
        waiting.forEach { webView.evaluateJavaScript($0, completionHandler: nil) }
    }

    /// 앱 안에서는 우리 파일만 연다. 바깥 주소는 사파리로 넘긴다.
    /// 지금은 외부 링크가 없지만, 나중에 하나 생겼을 때 앱이 통째로 떠나가면 곤란하다.
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == BundleSchemeHandler.scheme {
            decisionHandler(.allow)
            return
        }
        if url.scheme == "http" || url.scheme == "https" || url.scheme == "mailto" {
            /// 메일 앱이 없거나 메일 계정이 없으면 열리지 않는다. 그때 버튼이 아무 반응 없어 보이지 않게 웹에 알린다
            UIApplication.shared.open(url, options: [:]) { [weak webView] ok in
                guard !ok, url.scheme == "mailto" else { return }
                webView?.evaluateJavaScript("typeof mailFailedFromApp === 'function' && mailFailedFromApp()", completionHandler: nil)
            }
        }
        decisionHandler(.cancel)
    }
}
