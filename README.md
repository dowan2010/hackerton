# 루트홈 (RootHome) - FastAPI 백엔드

소설 '노 휴먼스 랜드' 속 국가 일괄 통제의 비극을 공간 데이터와 AI 기술로 극복하는 기후 실향민 매핑 플랫폼 **'루트홈 (RootHome)'**의 백엔드 저장소입니다.

## 🛠️ 핵심 기능
1.  **구역별 기후 회복도 예측 (Eco-Recovery Predictor)**: 동네 단위 헥사곤 그리드별 자연 복원 지표 수치 조회 API.
2.  **공정 귀향 우선순위 알고리즘 (Dignity Score Matrix)**: **Gemini 2.5-pro** 멀티모달 분석을 활용하여 유저 제출 서류 판독 및 우선 가중치 점수 산정.
3.  **고향의 봄 AI 타임라인 시뮬레이터**: **Gemini 2.5-flash**를 사용해 옛 주소 기반 맞춤형 감성 기후 일기 피드 생성.

---

## 🔒 중요 환경 변수 (.env) 안내

> [!IMPORTANT]
> 로컬 테스트 및 실배포용 `.env` 설정 세부 정보(Gemini API Key, Google Maps API Key 등)는 **김도완**에게 직접 요청해 주시기 바랍니다.

---

## ⚙️ 로컬 가동 가이드 (Local Quick Start)

### 1. 가상환경 활성화 및 패키지 설치
```bash
# 가상환경이 설치되지 않은 경우 생성
python3 -m venv backend/venv

# 가상환경 활성화
source backend/venv/bin/activate

# 의존성 패키지 설치
pip install -r backend/requirements.txt
```

### 2. API 서버 실행
```bash
uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```
*   서버가 구동되면 `http://localhost:8000/docs` (Swagger UI)에서 API 명세서 확인 및 테스트가 가능합니다.
