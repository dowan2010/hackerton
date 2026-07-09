import os
from google import genai
from google.genai import types
from schemas import DocumentAnalysisResult, ZoneRecoveryData

class GeminiService:
    def __init__(self):
        # google-genai SDK 1.0+ 표준 초기화
        # API Key는 환경 변수 GEMINI_API_KEY에서 로드되거나 명시적으로 전달 가능
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        
        if not api_key:
            print("[Warning] GEMINI_API_KEY 환경 변수가 세팅되지 않았습니다. 백엔드는 '가상 AI 데모 모드'로 응답합니다.")
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                print("[Gemini] Google GenAI Client가 정상적으로 초기화되었습니다.")
            except Exception as e:
                print(f"[Gemini Warning] Google GenAI Client 초기화 실패: {str(e)}. '가상 AI 데모 모드'로 응답합니다.")

    async def analyze_document(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> DocumentAnalysisResult:
        """
        제출된 증빙 서류 이미지(등본, 진단서 등)에서 주민 정보를 멀티모달 인식 및 Structured Output으로 정형 추출합니다.
        """
        # API 키가 없거나 클라이언트 세팅에 실패한 경우 로컬 모킹 데이터 즉시 반환
        if not self.client:
            print("[Gemini Demo] API 키가 감지되지 않아 사전 수립된 가상 데이터 판독 결과를 반환합니다.")
            return DocumentAnalysisResult(
                age=82,
                health_status="위독",
                residence_duration_years=25,
                extraction_confidence=0.98,
                reasoning="판독된 주민등록등본에 따르면 신청자는 만 82세 고령이며, 심장질환 관련 진단서 소견에 비추어 긴급 순위 '위독' 등급 및 과거 고향 장기 거주자(25년)임이 안전하게 증빙되었습니다. (데모 모드 판독)"
            )

        try:
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            )
            
            prompt = (
                "당신은 실향민 복지 AI 에이전트 '루트홈'입니다. "
                "업로드된 이미지(주민등록등본, 주민등록초본, 병원 소견서, 기저질환 증빙서 등)를 "
                "정교하게 분석하여 신청자의 나이, 질환 유무에 기초한 건강 심각성 상태, "
                "그리고 과거 노휴먼스랜드 내 실제 주민등록 거주 기간(연수)을 판독해 주십시오.\n\n"
                "의료적 처방전이나 병원 서류 내용이 심각하면 '위독', 경미하거나 통원 필요 수준이면 '주의', "
                "건강 정보가 전혀 확인되지 않거나 완전 건강할 경우 '정상'으로 분류합니다."
            )

            response = self.client.models.generate_content(
                model='gemini-2.5-pro',
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DocumentAnalysisResult,
                    temperature=0.1,
                ),
            )
            
            # 반환된 텍스트는 Pydantic 규격에 부합하는 JSON 포맷입니다.
            return DocumentAnalysisResult.model_validate_json(response.text)
        except Exception as e:
            print(f"[Gemini Error] 분석 도중 에러가 발생했습니다: {str(e)}")
            # 데모 상황을 위한 Safe Fallback 가상 데이터 제공
            return DocumentAnalysisResult(
                age=78,
                health_status="주의",
                residence_duration_years=12,
                extraction_confidence=0.5,
                reasoning="인터넷 연결 지연 등으로 인한 시스템 백업 데이터 판독 결과입니다. (데모 모드 지원)"
            )

    def calculate_priority_score(self, analysis: DocumentAnalysisResult) -> float:
        """
        기획서에 명시된 Dignity Score Matrix 점수 계산 수식 적용
        1. 나이 점수 (최대 40점): 60세 미만(10점), 60대(20점), 70대(30점), 80세 이상(40점)
        2. 건강 점수 (최대 40점): 정상(10점), 주의(20점), 위독(40점)
        3. 거주 기간 점수 (최대 20점): 거주 기간 1년당 2점 (최대 20점)
        """
        # 1) 나이 산정
        if analysis.age >= 80:
            age_score = 40.0
        elif analysis.age >= 70:
            age_score = 30.0
        elif analysis.age >= 60:
            age_score = 20.0
        else:
            age_score = 10.0

        # 2) 건강 산정
        if analysis.health_status == "위독":
            health_score = 40.0
        elif analysis.health_status == "주의":
            health_score = 20.0
        else:
            health_score = 10.0

        # 3) 거주 기간 산정
        residence_score = min(analysis.residence_duration_years * 2.0, 20.0)

        # 총점 합산
        total_score = age_score + health_score + residence_score
        return round(total_score, 2)

    async def generate_hometown_diary(self, address: str, zone_data: ZoneRecoveryData) -> str:
        """
        고향의 봄 AI 타임라인 시뮬레이터 텍스트 생성 기능
        입력한 옛 주소와 매칭된 구역의 실시간 환경 회복 수치를 바탕으로 감성적 복구 일기 피드를 만듭니다.
        """
        if not self.client:
            print("[Gemini Demo] API 키가 감지되지 않아 사전에 감수한 따뜻한 가상 고향 정원 일기 피드를 전송합니다.")
            return (
                f"봄바람이 부는 고향 {address}의 구릉지에 드디어 초록빛 무성한 들풀이 무릎춤까지 차올랐습니다. "
                f"현재 루트홈 환경 측정상 식생 복구율이 무려 {zone_data.recovery_rate}%에 달합니다.\n\n"
                f"어린 시절 뛰놀던 개울가에는 맑은 민물이 가득 고여 수달들의 발자국이 선명하게 목격되고 있으며, "
                f"대기 오염 점수가 무려 {zone_data.air_quality}/100을 찍어 산들바람 속에서 투명한 풀향기가 배어 나옵니다. "
                f"살아생전 옛 마당 한편에 서 있던 고목나무 그늘 아래서 따뜻한 보리차 한잔을 마실 그날이 성큼 다가왔음을, "
                f"이 푸르른 흙 내음이 먼저 귀띔해 주는 듯합니다."
            )

        try:
            prompt = (
                f"당신은 실향민의 정신적 아픔과 영혼을 달래주는 작가형 문학 AI입니다.\n"
                f"사용자가 기후 난민이 되어 빼앗겼던 그리운 고향의 옛 주소는 '{address}' 입니다.\n"
                f"그리고 이 구역은 현재 루트홈 시스템 상 구역 코드 '{zone_data.zone_id}' ({zone_data.zone_name})에 매핑되어 있습니다.\n\n"
                f"현재 이 구역의 실제 환경 지표 데이터는 다음과 같습니다:\n"
                f"- 전체 자연 회복률: {zone_data.recovery_rate}%\n"
                f"- 대기 건강도: {zone_data.air_quality}/100\n"
                f"- 토양 정화도: {zone_data.soil_contamination}/100\n"
                f"- 식생 지수 (NDVI): {zone_data.vegetation_ndvi} (최대 1.0)\n"
                f"- 봉쇄 현황: {zone_data.status}\n"
                f"- 안전 복귀까지 남은 기간: {zone_data.time_to_safe_years}년\n\n"
                f"위 환경 복구 지표들의 변화 추이를 마치 매주 기록해 나가는 한 편의 서정적인 복구 일기(Hometown Spring Timeline) 형태로 2~3문단 작성해 주세요. "
                f"삭막한 숫자만 가득한 통계 분석이 아니라, '개개비 울음소리가 다시 들려오기 시작했다', "
                f"'고향 앞마당의 늙은 살구나무 가지 끝에 새 연두색 싹이 돋아나기 시작해 올해 바람은 흙냄새가 맑다'는 등의 "
                f"구체적 자연 묘사와 원거주민의 향수를 어루만져 주는 가슴 따뜻한 감성으로 한글로 작성해 주세요."
            )

            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=800,
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"[Gemini Diary Error] 일기 생성 실패: {str(e)}")
            return (
                f"비 내린 뒤 고향 {address}의 흙내음이 아스라이 퍼져나갑니다. "
                f"현재 수치 분석 상 자연 정화율이 {zone_data.recovery_rate}%에 이르며, "
                f"들풀들이 메말랐던 논둑길을 뒤덮기 시작해 고향의 공기가 매일 맑아지고 있습니다. "
                f"당신의 보금자리로 향하는 길이 조금씩 가까워지고 있음을 느낍니다."
            )
