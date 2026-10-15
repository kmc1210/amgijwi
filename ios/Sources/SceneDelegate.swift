import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        /// 페이지가 그려지기 전 한순간 비치는 바탕. 런치 화면과 같은 색이라 흰 화면이 번쩍이지 않는다.
        window.backgroundColor = UIColor(named: "LaunchBackground")
        let app = WebAppViewController()
        window.rootViewController = app
        window.makeKeyAndVisible()
        self.window = window
        /// 앱이 꺼져 있을 때 위젯을 눌러 켰거나 레시피 파일(.amgijwi)로 열었으면 주소가 여기로 온다.
        if let url = connectionOptions.urlContexts.first?.url { open(url, in: app) }
    }

    /// 앱이 켜져 있을 때 위젯을 눌렀거나 레시피 파일로 열었으면 여기로 온다.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url, let app = window?.rootViewController as? WebAppViewController else { return }
        open(url, in: app)
    }

    /// 파일이면 레시피 받기, 아니면 위젯 주소.
    private func open(_ url: URL, in app: WebAppViewController) {
        if url.isFileURL { app.openRecipeFile(url) } else { app.openWidget(url) }
    }
}
