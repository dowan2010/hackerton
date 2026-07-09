import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 환경 변수 로드 (main.py가 있는 폴더의 .env 파일을 정확히 찾아서 로드)
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

from schemas import ZoneRecoveryData, PriorityScoreResponse, TimelineFeedRequest
from services.gemini_service import GeminiService
from services.firebase_service import FirebaseService

app = FastAPI(
    title="루트홈 (RootHome) API",
    description="기후 실향민을 위한 구역별 회복도 시뮬레이션 및 우선순위 귀향 신청 지원 백엔드 서버",
    version="1.0.0"
)

# 해커톤 프론트엔드(Next.js) 자유 통신을 위한 CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 핵심 비즈니스 서비스 클래스 초기화
firebase_service = FirebaseService()
gemini_service = GeminiService()

@app.get("/")
def read_root():
    """백엔드 서버 헬스 체크 엔드포인트"""
    return {
        "status": "online",
        "service": "RootHome API Gateway",
        "demo_mode": firebase_service.demo_mode
    }

@app.get("/api/zones", response_model=list[ZoneRecoveryData])
async def get_zones():
    """
    1. 인터랙티브 지도(RootMap) 연동용 API
    모든 헥사곤 구역의 상세 기후 및 자연 회복 데이터를 반환합니다.
    """
    try:
        zones = firebase_service.get_all_zones()
        return zones
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"구역 데이터를 읽어오는 도중 실패했습니다: {str(e)}"
        )

@app.post("/api/applicants/upload", response_model=PriorityScoreResponse)
async def upload_and_evaluate_document(
    user_id: str = Form(..., description="신청자 고유 ID (이메일 혹은 UUID 형태)"),
    file: UploadFile = File(..., description="주민등록등본, 병원 소견서 등의 서류 이미지 파일 (JPEG/PNG)")
):
    """
    2. 공정 귀향 우선순위 분석 및 저장 API
    사용자가 업로드한 증빙 서류 이미지 파일을 받아 Cloud Storage에 보관한 뒤,
    Gemini 1.5 Pro 멀티모달 인식 기능으로 나이, 건강지수, 거주 연수를 판독하고 가중치 우선순위를 산출하여 Firestore에 기록합니다.
    """
    # 1) 파일 포맷 방어 검증
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="서류 업로드는 이미지 파일(PNG, JPG, JPEG)만 허용됩니다."
        )

    try:
        # 파일 바이너리 리딩
        file_bytes = await file.read()
        
        # 2) Firebase Storage 업로드 진행
        public_url = firebase_service.upload_document_file(user_id, file_bytes, file.filename, content_type=file.content_type)
        print(f"[API] 파일 업로드 완료. URL: {public_url}")
        
        # 3) Gemini API 멀티모달 정형 데이터 분석 진행
        print("[API] Gemini 멀티모달 분석을 시작합니다...")
        analysis_result = await gemini_service.analyze_document(file_bytes, mime_type=file.content_type)
        print(f"[API] Gemini 분석 완료: {analysis_result}")
        
        # 4) Dignity Score Matrix 알고리즘 기반 스코어 연산
        score = gemini_service.calculate_priority_score(analysis_result)
        print(f"[API] 계산된 우선순위 총점: {score}점")
        
        # 5) 최종 연산 점수 및 실시간 정렬 대기 순번 Firestore에 데이터 적재
        response_payload = firebase_service.save_applicant_result(user_id, analysis_result, score)
        return response_payload
        
    except Exception as e:
        print(f"[API Error] 신청 서류 연산 중 문제 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"서류 처리 및 AI 가중치 산출 중 치명적인 장애가 발생했습니다: {str(e)}"
        )

@app.post("/api/diary/generate")
async def generate_timeline_diary(payload: TimelineFeedRequest):
    """
    3. 고향의 봄 AI 타임라인 시뮬레이터 API
    입력한 옛 주소 주변의 실제 기후 수치와 매핑하여, 향수를 치유하고 서정적인 위로를 전하는 복구 일기를 실시간 생성합니다.
    """
    try:
        # 가독성을 높이기 위해 입력 주소 기반으로 매칭될 구역 정보를 실시간 매핑 시뮬레이션
        # 실해커톤 데모에서는 주소에 강원도/고성/아야진 등의 키워드가 있으면 이에 맞는 구역을 동적으로 반환
        zones = firebase_service.get_all_zones()
        matched_zone = zones[0] # 디폴트
        
        address_text = payload.address
        for zone in zones:
            # 주소 키워드 매칭
            simple_keyword = zone.zone_name.split()[-2] if len(zone.zone_name.split()) >= 2 else zone.zone_name
            if simple_keyword in address_text:
                matched_zone = zone
                break
                
        print(f"[API] 주소 '{address_text}'에 대하여 구역 '{matched_zone.zone_name}'을 매핑했습니다.")
        diary_content = await gemini_service.generate_hometown_diary(address_text, matched_zone)
        
        return {
            "address": address_text,
            "mapped_zone_id": matched_zone.zone_id,
            "mapped_zone_name": matched_zone.zone_name,
            "recovery_rate": matched_zone.recovery_rate,
            "diary_feed": diary_content
        }
    except Exception as e:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 고향 복구 일기 생성 실패: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # 로컬 수동 테스트 구동용
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
