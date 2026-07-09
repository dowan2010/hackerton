import requests
import io
import sys

def run_integration_tests():
    base_url = "http://127.0.0.1:8000"
    print("========== 🚀 루트홈 (RootHome) 백엔드 통합 API 테스트 시작 ==========")

    # 1. 헬스 체크 확인
    try:
        r = requests.get(f"{base_url}/")
        r.raise_for_status()
        print(f"[SUCCESS] 헬스체크 통과! -> {r.json()}")
    except Exception as e:
        print(f"[FAIL] 헬스체크 오류. uvicorn 서버가 켜져 있는지 확인해 주세요: {str(e)}")
        sys.exit(1)

    # 2. 구역 조회 테스트
    try:
        r = requests.get(f"{base_url}/api/zones")
        r.raise_for_status()
        print(f"[SUCCESS] 구역 조회 API 통과! -> 총 {len(r.json())}개의 헥사곤 구역 데이터를 불러왔습니다.")
    except Exception as e:
        print(f"[FAIL] 구역 조회 API 오류: {str(e)}")

    # 3. 고향의 봄 AI 타임라인 생성 테스트
    try:
        payload = {"address": "강원도 고성군 아야진리 123번지"}
        r = requests.post(f"{base_url}/api/diary/generate", json=payload)
        r.raise_for_status()
        print("[SUCCESS] 고향의 봄 AI 일기 시뮬레이터 생성 완료!")
        print(f"         - 매핑된 구역: {r.json().get('mapped_zone_name')}")
        print(f"         - 일기 피드: {r.json().get('diary_feed')[:120]}...")
    except Exception as e:
        print(f"[FAIL] AI 일기 생성 오류: {str(e)}")

    # 4. 멀티모달 증빙서류 우선순위 판독 및 등수 발행 테스트
    try:
        # 가상의 서류 이미지 바이너리 생성 (테스트를 위해 빈 이미지 바이트 전송)
        # 실제 등본이나 처방전 .jpg를 넣어도 가동됩니다.
        mock_file = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00")
        files = {
            "file": ("test_doc.jpg", mock_file, "image/jpeg")
        }
        data = {
            "user_id": "test_user_dowan"
        }
        print("[RUN] 가상 서류 업로드 및 AI 우선순위 산출 연산 진행 중...")
        r = requests.post(f"{base_url}/api/applicants/upload", data=data, files=files)
        r.raise_for_status()
        res = r.json()
        print("[SUCCESS] 서류 업로드 및 우선 가중치 판독 API 통과!")
        print(f"         - 판독 나이: {res['extracted_data']['age']}세")
        print(f"         - 판독 건강지수: {res['extracted_data']['health_status']}")
        print(f"         - 과거 거주 기간: {res['extracted_data']['residence_duration_years']}년")
        print(f"         - 최종 합산 점수: {res['calculated_score']}점 (100점 만점)")
        print(f"         - 실시간 정렬 대기 순번: {res['queue_number']}번")
        print(f"         - AI 채점 사유: {res['extracted_data']['reasoning']}")
    except Exception as e:
        print(f"[FAIL] 서류 판독 및 채점 API 오류: {str(e)}")

    # 5. 50개년 기후 오염 예측 시뮬레이션 API 테스트
    try:
        r = requests.get(f"{base_url}/api/zones/prediction")
        r.raise_for_status()
        res_data = r.json()
        print("[SUCCESS] 50개년 기후 예측 시계열 API 통과!")
        print(f"         - 첫 구역 예측지: {res_data[0]['zone_name']}")
        print(f"         - 2026년 예측 오염도: {res_data[0]['predictions'][0]['pollution_rate']}% ({res_data[0]['predictions'][0]['status']})")
        print(f"         - 2050년 예측 오염도: {res_data[0]['predictions'][12]['pollution_rate']}% ({res_data[0]['predictions'][12]['status']})")
        print(f"         - 2076년 예측 오염도: {res_data[0]['predictions'][25]['pollution_rate']}% ({res_data[0]['predictions'][25]['status']})")
    except Exception as e:
        print(f"[FAIL] 50개년 기후 예측 API 오류: {str(e)}")

    print("====================== 🎉 모든 백엔드 통합 API 테스트 완료! ======================")

if __name__ == "__main__":
    run_integration_tests()
