import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import KakaoSDKCommon
import KakaoSDKAuth

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Kakao SDK 초기화
    if let path = Bundle.main.path(forResource: "Info", ofType: "plist"),
       let plist = NSDictionary(contentsOfFile: path),
       let kakaoAppKey = plist["KAKAO_APP_KEY"] as? String {
      print("🔑 === 카카오 앱 키 로드 성공 === \(kakaoAppKey)")
      KakaoSDK.initSDK(appKey: kakaoAppKey)
      print("✅ === 카카오 SDK 초기화 완료 ===")
    } else {
      print("❌ === 카카오 앱 키 로드 실패 ===")
      // 하드코딩된 앱 키로 초기화 시도
      KakaoSDK.initSDK(appKey: "8664599143dee6919c04f7b00e0a495d")
      print("✅ === 카카오 SDK 하드코딩 초기화 완료 ===")
    }
    
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "saha_new",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if (AuthApi.isKakaoTalkLoginUrl(url)) {
      return AuthController.handleOpenUrl(url: url)
    }
    return false
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
