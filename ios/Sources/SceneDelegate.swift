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
        window.rootViewController = WebAppViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}
