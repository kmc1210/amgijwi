import UIKit
import WebKit
import AVFoundation

/// 화면 전체를 덮는 웹뷰 하나가 앱의 전부다.
final class WebAppViewController: UIViewController {

    private var webView: WKWebView!
    private let handler: BundleSchemeHandler?

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
        let flag = WKUserScript(source: "window.__amgijwiNative = true;",
                                injectionTime: .atDocumentStart,
                                forMainFrameOnly: true)
        config.userContentController.addUserScript(flag)

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self

        /// 안전 영역까지 페이지가 직접 그린다. index.html 의 viewport-fit=cover 와 짝이다.
        /// 여기서 여백을 자동으로 넣어버리면 노치 대응 CSS 와 이중으로 겹친다.
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        /// 학습 카드가 위아래로 출렁이면 앱 같지 않다.
        webView.scrollView.bounces = false

        /// 뒤로 쓸어넘기면 앱이 빈 화면이 된다. 화면 이동은 앱이 알아서 한다.
        webView.allowsBackForwardNavigationGestures = false

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
