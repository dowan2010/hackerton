from pydantic import BaseModel, Field
from typing import Literal, Optional

class DocumentAnalysisResult(BaseModel):
    """Gemini API가 업로드된 증빙 서류 이미지에서 판독해 낼 정밀 추출 스키마"""
    age: int = Field(description="제출 서류 상 신청자의 연령 (정확한 나이를 모르면 서류 분석을 통해 추정치 기입)")
    health_status: Literal["정상", "주의", "위독"] = Field(
        description="진단서, 소견서 내용 기반으로 판별한 건강 상태 분류 (일반적인 처방전은 주의, 위급한 심혈관/말기 질환은 위독, 서류상 질병 언급이 없으면 정상)"
    )
    residence_duration_years: int = Field(
        description="등본, 주민등록초본 상 해당 노휴먼스랜드(과거 거주지)에 실제 주민등록되어 거주했던 연수(단위: 년)"
    )
    extraction_confidence: float = Field(
        ge=0.0, le=1.0, 
        description="문서 판독 및 정보 추출의 정확도 신뢰 수준 점수 (0.0 ~ 1.0)"
    )
    reasoning: str = Field(
        description="우선순위 산정 근거에 대한 핵심 요약 설명과 신청자를 위로하는 인도주의적 관점의 안내 메시지"
    )

class PriorityScoreResponse(BaseModel):
    """우선순위 산정이 완료된 최종 유저 신청 정보 스키마"""
    user_id: str = Field(description="신청자 고유 식별값")
    extracted_data: DocumentAnalysisResult = Field(description="Gemini API로 서류에서 추출한 원본 파싱 데이터")
    calculated_score: float = Field(ge=0.0, le=100.0, description="최종 산정된 귀향 우선순위 점수 (100점 만점)")
    queue_number: int = Field(description="현재 기준 해당 구역 실시간 대기 순번")

class ZoneRecoveryData(BaseModel):
    """지도 시각화(RootMap) 및 헥사곤 렌더링을 위해 개별 구역 환경 상태를 정의하는 스키마"""
    zone_id: str = Field(description="헥사곤 그리드 기준 구역 고유 식별 코드 (예: KR-GW-01)")
    zone_name: str = Field(description="해당 구역의 소설 상 실제 지명 (예: 강원도 고성군 대진리)")
    status: Literal["봉쇄", "예약가능", "귀향시작"] = Field(
        description="현재 구역 봉쇄 상황 (봉쇄: 적색 / 예약가능: 황색 / 귀향시작: 녹색)"
    )
    recovery_rate: float = Field(ge=0.0, le=100.0, description="실시간 기후 회복도 비율 (%)")
    time_to_safe_years: float = Field(ge=0.0, description="안전 귀향 가능 예상 시점까지 남은 연수 (단위: 년, 0.0이면 즉시 귀향 가능)")
    air_quality: float = Field(description="대기 건강도 지수 (오염 농도 환산 역산점수)")
    soil_contamination: float = Field(description="토양 정화율 및 오염 지수 수치")
    vegetation_ndvi: float = Field(description="NDVI 식생 지수 (자연 복원도)")
    description: str = Field(description="해당 구역의 현재 식생 상태, 야생 동물 복원 추이 등을 담은 환경 복구 피드 텍스트")

class TimelineFeedRequest(BaseModel):
    """고향의 봄 AI 타임라인 시뮬레이터 입력을 위한 주소 스키마"""
    address: str = Field(description="원거주민이 거주했던 옛 고향의 대략적인 주소 또는 지명")
