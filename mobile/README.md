# 🧭 RootHome Mobile App (React Native)

기후 실향민 안심 복귀 및 안전 우회 네비게이션 모바일 전용 앱 프로젝트입니다. 
**Expo SDK 51** 및 **React Native 코어 아키텍처**를 기반으로 설계되어, 복잡한 iOS/Android 개별 개발환경 셋업 없이 즉시 기기에서 무결하게 실행 및 제어할 수 있습니다.

---

## 🚀 주요 탑재 핵심 가치 (Mobile Value)

1. **🔒 실향민 안심 모바일 게이트웨이**: 
   - 비로그인 최초 진입 시, 하단의 관제 레이어가 잠겨 조작할 수 없으며 웹 대시보드와 일치하는 **엄격 비밀번호 검증 로그인** 절차를 통과해야만 보안 세션이 부여됩니다.
2. **🗺️ 초고화질 실시간 기상관제 지도 연동**:
   - `react-native-webview` 엔진을 사용해 국토 정밀 지도 레이어 및 OSRM 실제 도로 우회 polyline 스트로크를 고해상도로 렌더링합니다.
3. **📊 모바일 전용 프리미엄 바텀시트 (Bottom-Sheet HUD)**:
   - 현재 주행 상태, 최적 귀향 루트 안전 가이드, 전국 환경 정화 가속도 상황을 실시간 요약 제시해 주는 컴팩트한 게이지 HUD를 탑재했습니다.

---

## 🛠️ 기기 구동 가이드 (Quick Start)

### 1. 의존성 패키지 설치
`mobile` 폴더 내부로 이동하여 필요한 npm 패키지들을 설치합니다:
```bash
cd mobile
npm install
```

### 2. 로컬 개발 서버(Metro Bundler) 기동
Expo 개발 서포터를 작동합니다:
```bash
npm run start
# 또는 
npx expo start
```

### 3. 기기 및 시뮬레이터 구동
- **📱 실기기 테스트 (추천)**: 
  - 본인의 스마트폰(iOS App Store 또는 Google Play Store)에서 **"Expo Go"** 앱을 무료 다운로드합니다.
  - Metro Bundler 기동 시 터미널 화면에 생성되는 **QR 코드**를 기본 카메라 앱으로 촬영하여 스캔하면, 스마트폰 앱 내에서 즉시 실제 네이티브 코드가 컴파일 구동을 개시합니다!
- **💻 시뮬레이터 구동**:
  - `i` 버튼을 눌러 Xcode iOS Simulator 구동
  - `a` 버튼을 눌러 Android Studio Emulator 구동

---

## 🛰️ 데모 계정 정보
- **이메일 주소**: `test@roothome.org`
- **보안 비밀번호**: `password123`
