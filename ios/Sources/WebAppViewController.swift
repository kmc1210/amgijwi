import UIKit
import WebKit
import AVFoundation
import CoreHaptics

/// 화면 전체를 덮는 웹뷰 하나가 앱의 전부다.
final class WebAppViewController: UIViewController {

    private var webView: WKWebView!
    private let handler: BundleSchemeHandler?
    private let alarms = AlarmBridge()
    private let share = ShareBridge()
    private let haptics = HapticBridge()
    private let store = StoreBridge()

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

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        alarms.attach(webView)
        share.attach(webView, host: self)

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
    }

    /// window.__amgijwiHaptics: 진동을 낼 수 있는 기기인지. 아니면 설정의 진동 칸을 숨긴다.
    /// window.__amgijwiInfo: 건의 메일 본문에 붙이는 앱 버전 · 기기 · iOS 버전. 메일은 사용자가 직접 보낸다.
    private static func deviceScript() -> String {
        let haptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
        let b = Bundle.main.infoDictionary ?? [:]
        let ver = (b["CFBundleShortVersionString"] as? String ?? "?") + " (" + (b["CFBundleVersion"] as? String ?? "?") + ")"
        let info: [String: String] = ["app": ver, "device": UIDevice.current.model, "os": "iOS " + UIDevice.current.systemVersion]
        let json = (try? JSONSerialization.data(withJSONObject: info)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return " window.__amgijwiHaptics = \(haptics ? "true" : "false"); window.__amgijwiInfo = \(json);"
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
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }
}
