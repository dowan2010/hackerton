import os
import uuid
import firebase_admin
from firebase_admin import credentials, firestore, storage
from schemas import ZoneRecoveryData, DocumentAnalysisResult, PriorityScoreResponse

class FirebaseService:
    def __init__(self):
        self.demo_mode = False
        self.db = None
        self.bucket = None
        
        # 10개의 기본 데모용 헥사곤 구역 데이터 (소설 '노 휴먼스 랜드'의 접경/봉쇄 지대를 모티프로 구성)
        self.mock_zones = [
            ZoneRecoveryData(
                zone_id="KR-GW-01",
                zone_name="강원도 고성군 대진리 (남쪽 한계선)",
                status="봉쇄",
                recovery_rate=34.5,
                time_to_safe_years=5.8,
                air_quality=92.0,
                soil_contamination=12.5,
                vegetation_ndvi=0.45,
                description="수십 년간 기후 봉쇄 구역으로 지정되어 야생 생태계가 울창하게 복원 중이나, 지하 토양 전반에 유해 오염 축적분이 잔존하여 미세 정화 처리가 추가로 필요합니다."
            ),
            ZoneRecoveryData(
                zone_id="KR-GW-02",
                zone_name="강원도 고성군 거진리 (항구 구역)",
                status="예약가능",
                recovery_rate=78.2,
                time_to_safe_years=1.4,
                air_quality=95.5,
                soil_contamination=45.0,
                vegetation_ndvi=0.68,
                description="해양 생태계 복원도가 90% 이상으로 측정되었으며 대기질이 극히 우수합니다. 주민 편의 시설 복구 및 안전 기후 보장이 1년 내 완료될 것으로 예상되어 우선 귀향 대기 예약을 접수 중입니다."
            ),
            ZoneRecoveryData(
                zone_id="KR-GW-03",
                zone_name="강원도 고성군 아야진리 (남단 주거지)",
                status="귀향시작",
                recovery_rate=96.4,
                time_to_safe_years=0.0,
                air_quality=98.0,
                soil_contamination=89.5,
                vegetation_ndvi=0.81,
                description="기후 회복 지표가 기준점을 완벽히 초과했습니다. 공기가 매우 맑고 안전성이 확보되어 고령 실향민들을 필두로 1차 귀향민 실질 복귀 및 정착이 허가되었습니다."
            ),
            ZoneRecoveryData(
                zone_id="KR-GW-04",
                zone_name="강원도 인제군 서화면 (숲 계곡지대)",
                status="봉쇄",
                recovery_rate=51.2,
                time_to_safe_years=3.2,
                air_quality=89.0,
                soil_contamination=28.0,
                vegetation_ndvi=0.72,
                description="침엽수림과 야생 동물 개체군이 비약적으로 증가했습니다. 다만 계곡류 수질 정화 작업이 지연되어 정착을 위해서는 3년 가량의 기후 안정화 기간이 필요합니다."
            ),
            ZoneRecoveryData(
                zone_id="KR-GW-05",
                zone_name="강원도 철원군 갈말읍 (벌판 주거지)",
                status="예약가능",
                recovery_rate=82.9,
                time_to_safe_years=0.8,
                air_quality=94.0,
                soil_contamination=62.0,
                vegetation_ndvi=0.65,
                description="평야 지역 특유의 비옥한 황토와 일조량 덕분에 식물성 탄소 저장 능력이 가속화되었습니다. 올 하반기 중 대규모 거주 구역 해제 통보가 유력시됩니다."
            ),
            ZoneRecoveryData(
                zone_id="KR-GW-06",
                zone_name="강원도 양구군 동면 (분지 생태계)",
                status="봉쇄",
                recovery_rate=15.8,
                time_to_safe_years=8.5,
                air_quality=75.0,
                soil_contamination=8.0,
                vegetation_ndvi=0.32,
                description="자연 치유 능력이 비교적 더디게 발현 중인 기후 정화 극초기 단계입니다. 원거주민의 안보 및 생태 안정을 위해 당분간 전면적인 출입 통제가 지속됩니다."
            )
        ]
        
        # 데모용 유저 신청자 메모리 적재소
        self.mock_applicants = []

        # 데모용 회원 계정 및 등록 법안 메모리 적재소
        self.mock_users = {}
        self.mock_laws = []

        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
        project_id = os.getenv("FIREBASE_PROJECT_ID")

        if os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                # 이미 앱이 초기화되었는지 방어 코드 작성
                if not firebase_admin._apps:
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': f"{project_id}.appspot.com" if project_id else None
                    })
                self.db = firestore.client()
                # 버킷 초기화
                if project_id:
                    self.bucket = storage.bucket()
                print("[Firebase] Firebase Admin SDK가 성공적으로 초기화되었습니다.")
            except Exception as e:
                print(f"[Firebase Initialize Error] 초기화 실패: {str(e)}")
                print("[Firebase] Firebase 세팅 오류로 인해 백업 데모 모드(InMemory)로 실행합니다.")
                self.demo_mode = True
        else:
            print(f"[Firebase Warning] {cred_path} 자격 인증 파일을 찾을 수 없습니다.")
            print("[Firebase] 자격 인증서가 없으므로 시스템을 자동으로 백업 데모 모드(InMemory)로 구동합니다.")
            self.demo_mode = True

    def get_all_zones(self) -> list[ZoneRecoveryData]:
        """모든 헥사곤 구역 환경 데이터를 가져옵니다."""
        if self.demo_mode:
            return self.mock_zones
        
        try:
            zones_ref = self.db.collection('zones')
            docs = zones_ref.stream()
            zones = []
            for doc in docs:
                data = doc.to_dict()
                zones.append(ZoneRecoveryData(**data))
            
            # DB가 비어있으면 데모 데이터를 초기 적재
            if not zones:
                print("[Firebase] Firestore zones 컬렉션이 비어있어 기본 구역 데이터를 적재합니다.")
                for zone in self.mock_zones:
                    zones_ref.document(zone.zone_id).set(zone.model_dump())
                return self.mock_zones
            return zones
        except Exception as e:
            print(f"[Firestore Error] 구역 로드 오류: {str(e)}")
            return self.mock_zones

    def save_applicant_result(self, user_id: str, analysis: DocumentAnalysisResult, calculated_score: float) -> PriorityScoreResponse:
        """분석 결과와 최종 산출 점수를 저장하고, 실시간 정렬을 통해 대기 순번을 발행합니다."""
        if self.demo_mode:
            # 데모 모드 (인메모리 처리)
            # 기존 유저가 있으면 업데이트, 없으면 추가
            existing = next((x for x in self.mock_applicants if x["user_id"] == user_id), None)
            if existing:
                existing["analysis"] = analysis
                existing["score"] = calculated_score
            else:
                self.mock_applicants.append({
                    "user_id": user_id,
                    "analysis": analysis,
                    "score": calculated_score
                })
            
            # 점수 기준 내림차순(높은 점수가 우선) 정렬하여 등수(Queue Number) 산출
            self.mock_applicants.sort(key=lambda x: x["score"], reverse=True)
            queue_idx = next(i for i, x in enumerate(self.mock_applicants) if x["user_id"] == user_id)
            
            return PriorityScoreResponse(
                user_id=user_id,
                extracted_data=analysis,
                calculated_score=calculated_score,
                queue_number=queue_idx + 1 # 1등부터 대기 번호 부여
            )

        try:
            # Firestore 연동
            applicants_ref = self.db.collection('applicants')
            
            # 유저 신청 정보 저장
            applicants_ref.document(user_id).set({
                "user_id": user_id,
                "analysis": analysis.model_dump(),
                "score": calculated_score,
                "created_at": firestore.SERVER_TIMESTAMP
            })
            
            # 전체 신청자 리스트를 쿼리하여 점수 내림차순 정렬 후 실시간 등수 산출
            all_docs = applicants_ref.order_by("score", direction=firestore.Query.DESCENDING).stream()
            queue_num = 1
            for doc in all_docs:
                if doc.id == user_id:
                    break
                queue_num += 1
                
            return PriorityScoreResponse(
                user_id=user_id,
                extracted_data=analysis,
                calculated_score=calculated_score,
                queue_number=queue_num
            )
        except Exception as e:
            print(f"[Firestore Error] 신청 정보 저장 실패: {str(e)}")
            # 실패 시 데모 데이터 기반 복구 응답
            return PriorityScoreResponse(
                user_id=user_id,
                extracted_data=analysis,
                calculated_score=calculated_score,
                queue_number=7 # 임의 대기 번호 부여
            )

    def upload_document_file(self, user_id: str, file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
        """Cloud Storage에 유저 서류 파일을 안전하게 업로드하고 public URL을 발급합니다."""
        safe_filename = f"{user_id}_{uuid.uuid4().hex}_{filename}"
        
        if self.demo_mode or not self.bucket:
            # Firebase 버킷 미설정 시 가상의 다운로드 경로 제공
            print(f"[Storage Demo] {filename} 파일을 로컬/메모리 업로드 완료 처리했습니다.")
            return f"/mock-storage/applicants/{user_id}/{safe_filename}"
            
        try:
            blob = self.bucket.blob(f"applicants/{user_id}/{safe_filename}")
            blob.upload_from_string(file_bytes, content_type=content_type)
            blob.make_public()
            return blob.public_url
        except Exception as e:
            print(f"[Storage Error] 파일 업로드 실패: {str(e)}")
            return f"/mock-storage/applicants/{user_id}/{safe_filename}"
            
    def get_zone_by_id(self, zone_id: str) -> ZoneRecoveryData:
        """특정 zone_id의 환경 데이터 정보를 가져옵니다."""
        zones = self.get_all_zones()
        match = next((z for z in zones if z.zone_id == zone_id), None)
        if match:
            return match
        # 없을 경우 대안 폴백 구역 반환
        return self.mock_zones[0]

    # --- 회원 인증 (users 컬렉션) ---

    def get_user_by_email(self, email: str) -> dict | None:
        """이메일로 사용자 계정을 조회합니다 (비밀번호 해시 포함 원본 dict 반환)."""
        if self.demo_mode:
            return self.mock_users.get(email)

        try:
            doc = self.db.collection('users').document(email).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"[Firestore Error] 사용자 조회 실패: {str(e)}")
            return self.mock_users.get(email)

    def create_user(self, email: str, name: str, password_hash: str) -> None:
        """새 사용자 계정을 저장합니다."""
        user_doc = {"email": email, "name": name, "password_hash": password_hash}

        if self.demo_mode:
            self.mock_users[email] = user_doc
            return

        try:
            self.db.collection('users').document(email).set({
                **user_doc,
                "created_at": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            print(f"[Firestore Error] 사용자 생성 실패: {str(e)}")
            self.mock_users[email] = user_doc

    # --- 등록 법안 (laws 컬렉션) ---

    def get_laws_for_user(self, user_id: str) -> list[dict]:
        """특정 사용자가 등록한 법안 목록을 최신순으로 가져옵니다."""
        if self.demo_mode:
            return [l for l in self.mock_laws if l["user_id"] == user_id][::-1]

        try:
            docs = self.db.collection('laws').where('user_id', '==', user_id).order_by(
                'created_at', direction=firestore.Query.DESCENDING
            ).stream()
            return [{**doc.to_dict(), "id": doc.id} for doc in docs]
        except Exception as e:
            print(f"[Firestore Error] 법안 목록 조회 실패: {str(e)}")
            return [l for l in self.mock_laws if l["user_id"] == user_id][::-1]

    def create_law(self, user_id: str, badge: str, title: str) -> dict:
        """법안을 등록합니다."""
        law_id = uuid.uuid4().hex

        if self.demo_mode:
            law = {"id": law_id, "user_id": user_id, "badge": badge, "title": title}
            self.mock_laws.append(law)
            return law

        try:
            self.db.collection('laws').document(law_id).set({
                "user_id": user_id,
                "badge": badge,
                "title": title,
                "created_at": firestore.SERVER_TIMESTAMP
            })
            return {"id": law_id, "user_id": user_id, "badge": badge, "title": title}
        except Exception as e:
            print(f"[Firestore Error] 법안 등록 실패: {str(e)}")
            law = {"id": law_id, "user_id": user_id, "badge": badge, "title": title}
            self.mock_laws.append(law)
            return law

    def delete_law(self, user_id: str, law_id: str) -> bool:
        """법안을 삭제합니다. 본인 소유 법안만 삭제 가능합니다."""
        if self.demo_mode:
            before = len(self.mock_laws)
            self.mock_laws = [l for l in self.mock_laws if not (l["id"] == law_id and l["user_id"] == user_id)]
            return len(self.mock_laws) < before

        try:
            doc_ref = self.db.collection('laws').document(law_id)
            doc = doc_ref.get()
            if not doc.exists or doc.to_dict().get("user_id") != user_id:
                return False
            doc_ref.delete()
            return True
        except Exception as e:
            print(f"[Firestore Error] 법안 삭제 실패: {str(e)}")
            return False
