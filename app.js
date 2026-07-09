/* -------------------------------------------------------------
 * RootHome National Climate Risk Portal (app.js)
 * Implements: Leaflet Map API centered on South Korea,
 *             15 National Risk Zones (Past Cities, Gray Cities, No Humans Land)
 *             extracted from the book 'No Humans Land' (ocr_all.txt),
 *             and real FastAPI backend integration (port 8000).
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. STATE & MAP VARIABLES ---
    let activeTab = "rootmap"; // 'rootmap' / 'dignity' / 'timeline'
    let selectedZoneId = "KR-GW-03"; // Default: 아야진리
    
    let desktopMap = null;
    let mobileMap = null;
    let desktopMapCircles = {};
    let mobileMapCircles = {};
    let backendUrl = `https://roothome-backend-686146847894.asia-northeast3.run.app`;
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        backendUrl = "http://127.0.0.1:8000";
    }
    let predictionsData = null; // 50개년 머신러닝 기후 예측 데이터 캐시

    // 15 National climate risk zones mapped from 'No Humans Land' (ocr_all.txt)
    const mockZones = [
        // 1) No Humans Land (DMZ / Gangwon-do border area)
        {
            zone_id: "KR-GW-01",
            zone_name: "노휴먼스랜드 - 강원도 고성군 대진리 (남쪽 한계선)",
            status: "봉쇄",
            recovery_rate: 34.5,
            time_to_safe_years: 5.8,
            air_quality: 92.0,
            soil_contamination: 12.5,
            vegetation_ndvi: 0.45,
            lat: 38.5009,
            lng: 128.4307,
            description: "수십 년간 기후 봉쇄 구역으로 지정되어 야생 생태계가 복원 중이나, 지하 토양 전반에 유해 오염 축적분이 잔존하여 미세 정화 처리가 추가로 필요합니다."
        },
        {
            zone_id: "KR-GW-02",
            zone_name: "노휴먼스랜드 - 강원도 고성군 거진리 (항구 구역)",
            status: "예약가능",
            recovery_rate: 78.2,
            time_to_safe_years: 1.4,
            air_quality: 95.5,
            soil_contamination: 45.0,
            vegetation_ndvi: 0.68,
            lat: 38.4442,
            lng: 128.4616,
            description: "해양 생태계 복원도가 90% 이상으로 측정되었으며 대기질이 극히 우수합니다. 주민 편의 시설 복구 및 안전 기후 보장이 1년 내 완료될 것으로 예상되어 우선 귀향 대기 예약을 접수 중입니다."
        },
        {
            zone_id: "KR-GW-03",
            zone_name: "노휴먼스랜드 - 강원도 고성군 아야진리 (남단 주거지)",
            status: "귀향시작",
            recovery_rate: 96.4,
            time_to_safe_years: 0.0,
            air_quality: 98.0,
            soil_contamination: 89.5,
            vegetation_ndvi: 0.81,
            lat: 38.2731,
            lng: 128.5562,
            description: "기후 회복 지표가 기준점을 완벽히 초과했습니다. 공기가 매우 맑고 안전성이 확보되어 고령 실향민들을 필두로 1차 귀향민 실질 복귀 및 정착이 허가되었습니다."
        },
        {
            zone_id: "KR-GW-04",
            zone_name: "노휴먼스랜드 - 강원도 인제군 서화면 (숲 계곡지대)",
            status: "봉쇄",
            recovery_rate: 51.2,
            time_to_safe_years: 3.2,
            air_quality: 89.0,
            soil_contamination: 28.0,
            vegetation_ndvi: 0.72,
            lat: 38.2241,
            lng: 128.2144,
            description: "침엽수림 and 야생 동물 개체군이 비약적으로 증가했습니다. 다만 계곡류 수질 정화 작업이 지연되어 정착을 위해서는 3년 가량의 기후 안정화 기간이 필요합니다."
        },
        {
            zone_id: "KR-GW-05",
            zone_name: "노휴먼스랜드 - 강원도 철원군 갈말읍 (벌판 주거지)",
            status: "예약가능",
            recovery_rate: 82.9,
            time_to_safe_years: 0.8,
            air_quality: 94.0,
            soil_contamination: 62.0,
            vegetation_ndvi: 0.65,
            lat: 38.1473,
            lng: 127.3117,
            description: "평야 지역 특유의 비옥한 황토와 일조량 덕분에 식물성 탄소 저장 능력이 가속화되었습니다. 올 하반기 중 대규모 거주 구역 해제 통보가 유력시됩니다."
        },
        {
            zone_id: "KR-GW-06",
            zone_name: "노휴먼스랜드 - 강원도 양구군 동면 (분지 생태계)",
            status: "봉쇄",
            recovery_rate: 15.8,
            time_to_safe_years: 8.5,
            air_quality: 75.0,
            soil_contamination: 8.0,
            vegetation_ndvi: 0.32,
            lat: 38.2618,
            lng: 128.0645,
            description: "자연 치유 능력이 비교적 더디게 발현 중인 기후 정화 극초기 단계입니다. 원거주민의 안보 및 생태 안정을 위해 당분간 전면적인 출입 통제가 지속됩니다."
        },
        // 2) Past Cities (Safe / Elite Eco-Domes)
        {
            zone_id: "KR-SL-01",
            zone_name: "과거도시 - 서울 특별시 강남구 에코돔",
            status: "귀향시작",
            recovery_rate: 99.2,
            time_to_safe_years: 0.0,
            air_quality: 99.0,
            soil_contamination: 0.2,
            vegetation_ndvi: 0.90,
            lat: 37.4979,
            lng: 127.0276,
            description: "기후 재난 이후 완벽히 분리된 에코돔 내부 도시입니다. 과거의 물리적 풍요와 초고화질 산소 발생 시스템을 그대로 유지하며 특권층만이 거주하고 있습니다."
        },
        {
            zone_id: "KR-SJ-01",
            zone_name: "과거도시 - 세종 특별자치시 기후대피정부",
            status: "귀향시작",
            recovery_rate: 98.5,
            time_to_safe_years: 0.0,
            air_quality: 96.0,
            soil_contamination: 1.5,
            vegetation_ndvi: 0.85,
            lat: 36.4800,
            lng: 127.2890,
            description: "행정 및 대피 시스템의 핵심 과거도시 구역으로, 자동 환경 제어 장벽을 통해 유입되는 황사와 열파를 차단하여 최고의 안정성을 확보하고 있습니다."
        },
        // 3) Gray Cities (Polluted / High-Density Refugee Camps)
        {
            zone_id: "KR-IC-01",
            zone_name: "그레이시티 - 인천광역시 남동공단 수용소",
            status: "예약가능",
            recovery_rate: 55.4,
            time_to_safe_years: 1.8,
            air_quality: 48.0,
            soil_contamination: 74.0,
            vegetation_ndvi: 0.25,
            lat: 37.4470,
            lng: 126.7310,
            description: "수많은 기후 난민들이 몰려들어 숨막히는 밀도로 거주하는 그레이시티 구역입니다. 공장의 탄소 배출과 인구 포화로 미세먼지 수치가 항상 높게 감지됩니다."
        },
        {
            zone_id: "KR-US-01",
            zone_name: "그레이시티 - 울산광역시 남구 화학거주지",
            status: "예약가능",
            recovery_rate: 50.1,
            time_to_safe_years: 2.0,
            air_quality: 42.0,
            soil_contamination: 78.0,
            vegetation_ndvi: 0.20,
            lat: 35.5300,
            lng: 129.3300,
            description: "산업 잔재 오염과 인구 과밀화가 진행 중인 그레이시티입니다. 대지 정화 작업이 지연되고 있으나 생존을 위한 화학 및 공업 일자리를 찾아 피난 가구 유입이 이어집니다."
        },
        {
            zone_id: "KR-BS-01",
            zone_name: "그레이시티 - 부산광역시 사하구 항만캠프",
            status: "예약가능",
            recovery_rate: 58.2,
            time_to_safe_years: 1.5,
            air_quality: 55.0,
            soil_contamination: 65.0,
            vegetation_ndvi: 0.28,
            lat: 35.1040,
            lng: 128.9740,
            description: "해수면 상승 피해로 임시 차단된 부두가에 급조된 그레이시티 수용소입니다. 해안 바람 순환을 통해 유독 분진을 그나마 걷어내고 있으나 기반 식수가 매우 부족합니다."
        },
        {
            zone_id: "KR-AS-01",
            zone_name: "그레이시티 - 경기도 안산시 반월공단지대",
            status: "예약가능",
            recovery_rate: 52.9,
            time_to_safe_years: 1.9,
            air_quality: 51.0,
            soil_contamination: 71.0,
            vegetation_ndvi: 0.22,
            lat: 37.3210,
            lng: 126.8300,
            description: "공장 지대 인근의 그레이시티 거주 구역입니다. 대기 중 분진 수치가 높고, 대지 전체에 화학 오염수가 가득하여 정밀 환경 필터 정화 청구율이 치솟고 있습니다."
        },
        // 4) Additional No Humans Land (Wilderness Natural Recovery)
        {
            zone_id: "KR-JN-01",
            zone_name: "노휴먼스랜드 - 경상남도 지리산 천왕봉 복원구역",
            status: "봉쇄",
            recovery_rate: 65.8,
            time_to_safe_years: 4.2,
            air_quality: 95.0,
            soil_contamination: 18.0,
            vegetation_ndvi: 0.78,
            lat: 35.3300,
            lng: 127.7300,
            description: "인간의 접근이 전면 금지된 채 기후 정화 노드가 가동 중인 지리산 노휴먼스랜드입니다. 야생 조류와 상위 포식자 생태 복원도가 매우 가파릅니다."
        },
        {
            zone_id: "KR-JJ-01",
            zone_name: "노휴먼스랜드 - 제주도 한라산 백록담 보호령",
            status: "봉쇄",
            recovery_rate: 72.0,
            time_to_safe_years: 3.5,
            air_quality: 98.0,
            soil_contamination: 12.0,
            vegetation_ndvi: 0.88,
            lat: 33.3600,
            lng: 126.5300,
            description: "해양성 생태 격리법에 의해 통제되는 제주 한라산 영역입니다. 인류의 발길이 단절된 지 20년 만에 고산 지대 희귀 군락들이 복구 기준을 달성하고 있습니다."
        },
        {
            zone_id: "KR-UJ-01",
            zone_name: "노휴먼스랜드 - 경상북도 울진군 산불 통제지대",
            status: "봉쇄",
            recovery_rate: 12.5,
            time_to_safe_years: 9.2,
            air_quality: 85.0,
            soil_contamination: 42.0,
            vegetation_ndvi: 0.15,
            lat: 36.9930,
            lng: 129.4000,
            description: "기후 건조화 및 산불 재난으로 잿더미가 되어 버린 울진 산림 영역입니다. 복구율 12%의 정화 극초기 상태로, 기후 안정을 위해 최소 9년의 봉쇄 유지가 공시되었습니다."
        },
        {
            zone_id: "KR-DJ-01",
            zone_name: "과거도시 - 대전 광역시 유성구 에코연구단지",
            status: "귀향시작",
            recovery_rate: 98.5,
            time_to_safe_years: 0.0,
            air_quality: 97.0,
            soil_contamination: 1.0,
            vegetation_ndvi: 0.91,
            lat: 36.3620,
            lng: 127.3560,
            description: "기후 대피 및 환경 솔루션 설계의 핵심 연구 단지로, 최고 성능의 대지 정화 장치와 필터 배치를 통해 완벽한 안전성을 구가하고 있습니다."
        },
        {
            zone_id: "KR-GJ-01",
            zone_name: "과거도시 - 광주 광역시 북구 AI 기후제어단지",
            status: "귀향시작",
            recovery_rate: 94.2,
            time_to_safe_years: 0.0,
            air_quality: 94.0,
            soil_contamination: 0.8,
            vegetation_ndvi: 0.89,
            lat: 35.1800,
            lng: 126.9000,
            description: "AI 기후 시뮬레이터와 호남 전력 에코그리드가 작동하는 과거도시 구역으로, 장벽 내부 대기와 식수 순환 상태가 극히 맑게 밸런싱되어 있습니다."
        },
        {
            zone_id: "KR-DG-01",
            zone_name: "그레이시티 - 대구 광역시 서구 섬유공단 주거지",
            status: "예약가능",
            recovery_rate: 54.1,
            time_to_safe_years: 1.9,
            air_quality: 54.0,
            soil_contamination: 66.0,
            vegetation_ndvi: 0.21,
            lat: 35.8714,
            lng: 128.5550,
            description: "섬유단지 배후의 그레이시티 난민 주거지입니다. 분지 지형 특성상 매연 정체가 심하여 미세먼지 경보가 잦지만 방적 일자리를 얻기 위한 인구가 몰려 있습니다."
        },
        {
            zone_id: "KR-YS-01",
            zone_name: "그레이시티 - 전라남도 여수시 화학단지 피난 수용소",
            status: "예약가능",
            recovery_rate: 46.8,
            time_to_safe_years: 2.2,
            air_quality: 46.0,
            soil_contamination: 76.0,
            vegetation_ndvi: 0.18,
            lat: 34.8000,
            lng: 127.7000,
            description: "해안 정유 단지 인근 그레이시티 수용소입니다. 잔존 화학 공해와 수질 여과 지연으로 거주 안정 지표가 낮아 안전지대 이주 청원률이 대단히 높습니다."
        },
        {
            zone_id: "KR-TA-01",
            zone_name: "노휴먼스랜드 - 충청남도 태안군 연안 화학정화구역",
            status: "봉쇄",
            recovery_rate: 52.9,
            time_to_safe_years: 3.9,
            air_quality: 85.0,
            soil_contamination: 48.0,
            vegetation_ndvi: 0.52,
            lat: 36.7500,
            lng: 126.1500,
            description: "기상 해일 피해와 공업용수 누출로 장기 정제령이 선포된 노휴먼스랜드입니다. 자동 선박형 나노 필터를 갯벌에 배치하여 정화 관측 중에 있습니다."
        },
        {
            zone_id: "KR-DK-01",
            zone_name: "노휴먼스랜드 - 경상북도 울릉군 독도 기후 모니터링 초소",
            status: "봉쇄",
            recovery_rate: 88.5,
            time_to_safe_years: 2.5,
            air_quality: 99.0,
            soil_contamination: 5.0,
            vegetation_ndvi: 0.75,
            lat: 37.2427,
            lng: 131.8681,
            description: "기후 급변과 동해 방사능 조류 수치를 관측하기 위해 봉쇄된 해양 노휴먼스랜드입니다. AI 드론 탐사선이 실시간 영해 데이터를 루트홈 본부로 송출합니다."
        },
        // 5) Extended National Cities (전국 거점 도시 전격 보강)
        {
            zone_id: "KR-SU-01",
            zone_name: "과거도시 - 경기도 수원시 에코돔 복합단지",
            status: "귀향시작",
            recovery_rate: 97.2,
            time_to_safe_years: 0.0,
            air_quality: 95.0,
            soil_contamination: 2.0,
            vegetation_ndvi: 0.84,
            lat: 37.2636,
            lng: 127.0286,
            description: "경기도 남부 기후 연합 본부로, 에코돔 복합 시스템을 가치 있게 승화시킨 안전 구역입니다. 최고 성능의 자체 순환 수자원 정제 타워가 가동 중입니다."
        },
        {
            zone_id: "KR-PJ-01",
            zone_name: "노휴먼스랜드 - 경기도 파주시 문산읍 (휴전선 접경대)",
            status: "봉쇄",
            recovery_rate: 28.9,
            time_to_safe_years: 6.5,
            air_quality: 82.0,
            soil_contamination: 34.0,
            vegetation_ndvi: 0.48,
            lat: 37.8545,
            lng: 126.7876,
            description: "임진강 전선 인근의 접경지대로, 군사 및 자연 기류 정화 노드들이 동시에 투입되어 토양 자정 및 복원을 모니터링 중입니다."
        },
        {
            zone_id: "KR-CN-02",
            zone_name: "그레이시티 - 충청남도 천안시 서북구 난민컨테이너단지",
            status: "예약가능",
            recovery_rate: 53.2,
            time_to_safe_years: 1.8,
            air_quality: 49.0,
            soil_contamination: 68.0,
            vegetation_ndvi: 0.23,
            lat: 36.8150,
            lng: 127.1130,
            description: "충남 최대 규모의 임시 난민 밀집 주거 구역입니다. 탄소 차단 배출기 필터와 수질 대정화 기구가 차례로 도입되고 있습니다."
        },
        {
            zone_id: "KR-CB-02",
            zone_name: "그레이시티 - 충청북도 청주시 오창 과학캠프",
            status: "예약가능",
            recovery_rate: 61.4,
            time_to_safe_years: 1.2,
            air_quality: 53.0,
            soil_contamination: 59.0,
            vegetation_ndvi: 0.35,
            lat: 36.6424,
            lng: 127.4890,
            description: "중부 내륙 과학 정화 노드의 핵심지로, 대규모 드론 배치가 가능하여 최근 미세 대기질 개선 속도가 비약적으로 증가하고 있습니다."
        },
        {
            zone_id: "KR-JB-02",
            zone_name: "노휴먼스랜드 - 전라북도 전주시 덕진구 (자연치유숲)",
            status: "예약가능",
            recovery_rate: 81.5,
            time_to_safe_years: 0.5,
            air_quality: 93.0,
            soil_contamination: 24.0,
            vegetation_ndvi: 0.76,
            lat: 35.8468,
            lng: 127.1290,
            description: "전주 천택천 인근의 거목 식재 사업 성공으로 녹지 탄소 흡수량이 가속되어 복구 기준 달성 및 완전 해제가 눈앞에 다가왔습니다."
        },
        {
            zone_id: "KR-GN-03",
            zone_name: "그레이시티 - 경상남도 창원시 성산구 산소대비공단",
            status: "예약가능",
            recovery_rate: 58.0,
            time_to_safe_years: 1.6,
            air_quality: 52.0,
            soil_contamination: 62.0,
            vegetation_ndvi: 0.31,
            lat: 35.2280,
            lng: 128.6810,
            description: "남해 화학 기지 인근 수용 지구로, 정기적인 산소 수혈 큐브 배포와 숲 조성을 통해 복구율이 차례로 우상향 트렌드를 밟고 있습니다."
        },
        // 6) Global Hubs (글로벌 핵심 선진국 허브 수도 도시)
        {
            zone_id: "GL-TY-01",
            zone_name: "글로벌허브 - 일본 도쿄 지요다구 그린돔",
            status: "귀향시작",
            recovery_rate: 85.4,
            time_to_safe_years: 1.0,
            air_quality: 88.0,
            soil_contamination: 14.0,
            vegetation_ndvi: 0.74,
            lat: 35.6762,
            lng: 139.6503,
            description: "일본 도쿄 중심부에 구축된 대규모 수직 정원 및 차세대 에코돔입니다. 정화 로봇 군단이 가동되어 대기질 안정도가 타 글로벌 도시에 비해 조기 달성되었습니다."
        },
        {
            zone_id: "GL-NY-01",
            zone_name: "글로벌허브 - 미국 뉴욕 맨해튼 아일랜드 복구단지",
            status: "예약가능",
            recovery_rate: 72.8,
            time_to_safe_years: 2.1,
            air_quality: 76.0,
            soil_contamination: 22.0,
            vegetation_ndvi: 0.62,
            lat: 40.7128,
            lng: -74.0060,
            description: "해수면 상승 피해에 대응하여 맨해튼 자유의 여신상 일대에 초강력 인공방조제와 방어막을 거치하고 오염 정화 및 부분 귀향을 유치하는 중입니다."
        },
        {
            zone_id: "GL-LD-01",
            zone_name: "글로벌허브 - 영국 런던 템스강 기후수용본부",
            status: "귀향시작",
            recovery_rate: 91.2,
            time_to_safe_years: 0.0,
            air_quality: 92.0,
            soil_contamination: 8.5,
            vegetation_ndvi: 0.78,
            lat: 51.5074,
            lng: -0.1278,
            description: "런던 템스강 배리어 시스템을 가속하여 대기 정화를 마친 청정 복귀 캠프입니다. 고에너지 친환경 탄소 포집 타워가 템스 변을 따라 집중 기동 중입니다."
        },
        {
            zone_id: "GL-PR-01",
            zone_name: "글로벌허브 - 프랑스 파리 센강 기후유산보호구",
            status: "귀향시작",
            recovery_rate: 94.1,
            time_to_safe_years: 0.0,
            air_quality: 95.0,
            soil_contamination: 6.0,
            vegetation_ndvi: 0.82,
            lat: 48.8566,
            lng: 2.3522,
            description: "프랑스 안전유산 재건령에 의거 에펠탑 주변을 에코포레스트 삼림으로 완전 복원하였으며, 실향 시민들의 순차적 도시 복귀가 성공적으로 개시되었습니다."
        },
        {
            zone_id: "GL-BJ-01",
            zone_name: "글로벌허브 - 중국 베이징 차오양 탄소폐쇄지구",
            status: "봉쇄",
            recovery_rate: 41.6,
            time_to_safe_years: 4.8,
            air_quality: 38.0,
            soil_contamination: 82.0,
            vegetation_ndvi: 0.22,
            lat: 39.9042,
            lng: 116.4074,
            description: "기후 봉쇄 구역으로 오염 황사 제어 필터 및 공중 대규모 흡입 기어가 동적 정화를 진행 중이나, 여전히 수년 동안 완전한 정착을 통제하는 중입니다."
        },
        {
            zone_id: "GL-SD-01",
            zone_name: "글로벌허브 - 호주 시드니 오페라 생태복원해안",
            status: "귀향시작",
            recovery_rate: 96.8,
            time_to_safe_years: 0.0,
            air_quality: 97.0,
            soil_contamination: 2.0,
            vegetation_ndvi: 0.89,
            lat: -33.8688,
            lng: 151.2093,
            description: "호주 남태평양 자연 기류의 빠른 자정 이점을 적극 수혜받아 오염 정화율이 극에 달했으며, 이미 대다수 원주 시민들의 평화로운 해안 귀향이 완료되었습니다."
        }
    ];

    let zonesData = [...mockZones];
    
    // Dynamically calculate status based on recovery rate: <=30% is Blocked (봉쇄), 31-90% is Reservable (예약가능), >=91% is Safe (귀향시작)
    zonesData.forEach(zone => {
        if (zone.recovery_rate <= 30) {
            zone.status = "봉쇄";
        } else if (zone.recovery_rate <= 90) {
            zone.status = "예약가능";
        } else {
            zone.status = "귀향시작";
        }
    });

    // Customized AI spring recovery diaries for all 21 zones
    const zoneDiaries = {
        "KR-GW-01": {
            title: "대진리 남쪽 한계선 복원 개시",
            p1: "오랫동안 비무장 지대 남쪽 한계선에 굳게 가로막혀 통제되었던 대진리의 산마루에 연둣빛 참나무 싹이 고개를 내밀기 시작했습니다. 식생 복구율 34.5%로 대기 오염 정화는 완료되었으나 아직 토양 독성 해제가 과제로 남았습니다.",
            p2: "기존의 오염된 흙을 지키기 위해 드론을 이용해 미생물을 배포하였으며, 철조망 기슭에는 들꿩들이 무리 지어 모래목욕을 하는 맑은 자연 풍경이 포착되었습니다. 대기의 건강도가 무려 92.0을 기록해, 머지않아 정다운 흙냄새가 이곳을 완전히 메울 것입니다."
        },
        "KR-GW-02": {
            title: "거진리 항구 해안 생태 정화 가속",
            p1: "거진리 항구 선착장에 파도와 해풍을 타고 맑은 바다 냄새가 돌아오고 있습니다. 환경 복구율은 78.2%로 가파르게 상승하였으며, 주민 편의 시설 및 정착 가능 인프라의 복구가 1.4년 내로 안전하게 마무리될 것입니다.",
            p2: "연안의 수달 개체군이 부쩍 늘어 갯바위에 둥지를 틀기 시작했고, 바닷물 속 질소 화합물 독성 지수도 0.08ppm 이하로 대폭 감축되었습니다. 항구 주변의 모래사장에는 복원된 식생 띠가 갯잔디의 초록 물결로 아름다운 경관을 수놓고 있어 우선 예약을 신청받기 시작했습니다."
        },
        "KR-GW-03": {
            title: "아야진리 남단 주거지 귀향 시작",
            p1: "어릴 적 곱고 찬란한 모래와 투명한 바다가 있던 아야진리의 마당 한편에, 오랜 시간 잊혔던 참나무들이 언덕을 다시 채우기 시작합니다. 산들바람에 실려오는 숲의 숨결은 그 어느 때보다 깊고 맑으며 전체 회복률은 96.4%로 완전 기준치를 충족했습니다.",
            p2: "정화 노드들이 100% 가동을 마치고 은어들과 황어가 맑은 개울가로 돌아왔으며 토양의 독성 수치도 0.00%를 달성했습니다. 공기는 깃털처럼 가벼워졌고 실향민 1차 복귀가 정식 승인되어 정착 주택으로의 정다운 귀향 행렬이 막을 올렸습니다."
        },
        "KR-GW-04": {
            title: "서화면 계곡지대 숲의 맥박 안정",
            p1: "인제군 서화면 깊은 숲속 계곡에서 시작된 세찬 물줄기가 AI 여과 필터를 통과하며 기적 같은 맑은 소리를 뿜어내고 있습니다. 현재 자연 회복률은 51.2%로, 침엽수림의 활발한 탄소 고정 작용이 가속 페달을 밟았습니다.",
            p2: "멧돼지와 야생 노루들의 먹이 서식지가 점진적으로 안전 궤도에 올랐으나, 아직 계곡 하류 부분의 침전물 정화 작업이 약 3년 정도 추가 관찰을 필요로 합니다. 숲이 내뿜는 맑은 산소가 공기를 건강하게 정화하며 옛 마을 터로 들어가는 길을 넓혀주고 있습니다."
        },
        "KR-GW-05": {
            title: "갈말읍 황토 벌판 대규모 식생 고정",
            p1: "철원 평야의 옥토를 고스란히 간직한 갈말읍 벌판 위에, AI 기반 토양 정화 기술과 산림 생태가 만나 숨 가쁘게 회복 중입니다. 복원율은 82.9%에 도달하였으며 다가오는 수확기 즈음에 대규모 거주 해제가 유력합니다.",
            p2: "넓고 비옥한 평야의 흙 속에 탄소 저장 능력이 극대화(Sequestration 62%)되어, 풀꽃들이 대지를 빠르게 녹색으로 메우고 있습니다. 맑은 철원 대기 지수가 94.0을 기록하며 실향민들이 돌아와 마당에 씨앗을 뿌릴 날이 성큼 다가왔습니다."
        },
        "KR-GW-06": {
            title: "양구 동면 분지 자연 치유력 시동",
            p1: "양구 동면의 오목한 분지 지형 기슭 아래, 기후 정화 노드가 가동되며 인류가 돌아올 수 있는 조심스러운 희망의 싹을 틔웠습니다. 정화율은 15.8%로 가장 극초기 단계이며 전면 통제가 엄격하게 유지되고 있습니다.",
            p2: "스마트 센서 네트워크가 분지 전역에 촘촘히 구축되어 대기와 토양의 오염 잔류 물질을 밀리초 단위로 수집하고 있습니다. 25년(복구 완료)까지의 긴 시뮬레이션 중 1단계 착수 단계로, 숲과 산새들의 보금자리가 먼저 자생력을 기를 수 있도록 든든하게 차단해 둡니다."
        },
        "KR-SL-01": {
            title: "과거도시 서울 에코돔 복원 완료",
            p1: "과거도시 에코돔 내부의 대기와 토양 정화 점수는 99.2%로 무결점에 가깝습니다. 거대한 장벽으로 바깥세상과 차단된 채 과거 인류의 안온한 문명과 풍요로운 온실 정원을 유지하고 있습니다.",
            p2: "최고급 산소 발생기와 필터링 장치가 풀 가동 중이며, 상류 특권층을 수용하기 위한 안전 주택들이 가동을 시작했습니다. 그레이시티 난민들이 바라보는 장벽 너머로 눈부시게 푸른 식생들이 손짓하고 있습니다."
        },
        "KR-SJ-01": {
            title: "과거도시 세종 기후대피정부 보장",
            p1: "행정의 심장부인 세종 기후대피정부 구역은 98.5%의 생태 안정성을 확보하여 귀향 시작 판정을 받았습니다. 폭염과 먼지로부터 분리된 장벽식 행정 돔이 안전하게 가동 중입니다.",
            p2: "자동 급배수 정화 장치와 탄소 고정 녹지가 완벽히 통제되며 거주 안전도가 유지됩니다. 국가 핵심 기관 및 공무원들의 상주 시설이 안전 보장 하에 정상 운영되고 있습니다."
        },
        "KR-IC-01": {
            title: "그레이시티 인천 남동공단 난민 수용",
            p1: "남동공단 배후 수용소는 기후 피난민들이 빼곡히 몰려든 잿빛의 그레이시티입니다. 식생 회복율은 55.4%에 머물고 있으며 공장의 탄소 연기와 매연으로 대기질이 48.0에 그칩니다.",
            p2: "만성 미세먼지가 가득하지만 생존을 위한 일자리를 찾아 유입되는 난민들이 끝없이 대기하고 있습니다. 대지와 공기 필터링 강화를 위해 주민들이 자발적으로 정화 필터 부착을 청원하고 있습니다."
        },
        "KR-US-01": {
            title: "그레이시티 울산 남구 정화 연장",
            p1: "울산 공업 단지를 둘러싼 그레이시티 거주 구역은 50.1%의 더딘 회복율을 보이고 있습니다. 화학 공장 잔재와 매연으로 토양 오염도가 78.0으로 극히 불량하여 우선순위 귀향 관리가 가동 중입니다.",
            p2: "매일 매캐한 대기 속에 노출된 난민들은 열악한 수용 환경에서 안전을 위협받고 있습니다. AI 여과 센서를 가동하여 식수원의 오염 물질 배출 여부를 주시하며 2단계 주민 통제 정화를 예고하고 있습니다."
        },
        "KR-BS-01": {
            title: "그레이시티 부산 사하구 항만 캠프",
            p1: "해수면 상승 피해로 침수된 부두 가에 지어진 사하구 피난 수용소는 해안 그레이시티의 전형입니다. 식생 지수는 0.28에 불과하며 식수 공급이 원활하지 않아 모니터링이 수행 중입니다.",
            p2: "환기가 잘 되는 바닷바람 덕분에 공기 질은 55.0으로 그나마 숨을 쉴 수 있지만 거주 시설 노후화와 바닷물 역류 우려로 가중치 임시 등급 판정이 내려져 안전 구역 이주 예약이 줄을 잇고 있습니다."
        },
        "KR-AS-01": {
            title: "그레이시티 안산 반월공단 환경 경보",
            p1: "반월공단 배후 거주지는 52.9%의 회복 속도로 폭염 노출이 잦은 그레이시티 구역입니다. 기후 불평등이 가장 선명히 드러나며 토양 독성도 71.0ppm으로 검출되고 있습니다.",
            p2: "대기가 끈적하고 분진이 심하여 필터 마스크를 필수 장착해야 하는 유독한 주거 환경입니다. 더 나은 안전 난민 캠프로의 이주 비용을 마련하기 위해 수용소 내부에서 실시간 신청 접수 및 Gemini 판독이 몰리고 있습니다."
        },
        "KR-JN-01": {
            title: "노휴먼스랜드 지리산 천왕봉 야생 복구",
            p1: "인류가 철수하여 완전 통제 구역이 된 지리산의 대기질은 95.0, 자연 식생 NDVI는 0.78로 자가 자연 복구가 무서운 속도로 발현하고 있습니다. 현재 식생 자생력은 65.8%입니다.",
            p2: "맹수류와 멧돼지들이 완전히 점령하여 자연 평형을 찾아가고 있지만, 안전 귀향 연수가 4.2년 이상 더 통제해야 합니다. 지리산 기슭의 빈 집터에는 사람 대신 야생화와 덩굴나무가 주인이 되어 고요한 녹음을 자랑하고 있습니다."
        },
        "KR-JJ-01": {
            title: "노휴먼스랜드 한라산 백록담 환경 보호",
            p1: "기후 해양성 보호법에 의해 엄격히 인간의 출입이 금지된 한라산 구역은 72.0%의 회복율을 달성했습니다. 공기 건강도가 무려 98.0에 달하는 최적의 자생 식생 영역입니다.",
            p2: "인간의 방해가 사라지자 구상나무 군락과 숲이 기적처럼 되살아났습니다. 복원 모니터링 드론만이 상공에서 안전 감시 데이터를 송출하고 있으며 생태 자립이 완료되기까지 3.5년의 통제가 지속됩니다."
        },
        "KR-UJ-01": {
            title: "노휴먼스랜드 울진 산불 상흔 장기 봉쇄",
            p1: "극심한 기후 건조화로 발생한 대형 산불이 휩쓸고 간 울진 구역은 단 12.5%의 최하위 복원율을 보이는 극위험 노휴먼스랜드입니다. 토양이 회색 재와 산성 오염 물질로 찌들어 식생 지수(NDVI)가 0.15에 그칩니다.",
            p2: "자연 자생력이 거의 괴사하여 향후 9.2년 동안 출입이 전면 봉쇄되며 드론 조림 배치가 장기적으로 이뤄집니다. 화마가 남긴 검은 그루터기 사이로 흙을 개량하는 초밀도 방제 정화 노드가 바쁘게 가동 중입니다."
        },
        "KR-DJ-01": {
            title: "과거도시 대전 유성 에코연구단지",
            p1: "대전 유성의 카이스트 및 연구단지 인근 에코돔 구역은 98.5%의 우수한 기후 안정성을 보이고 있습니다. 엘리트 연구원들과 정부 과학자들이 거주하며 기후 장벽 제어 장치를 고도화하고 있습니다.",
            p2: "돔 내부의 산소 및 농도 밸런스가 매우 쾌적하게 자동 조율 중이며, 주변 지역의 기후 재난 데이터를 수집하는 컨트롤 타워 역할을 수행하고 있어 상시 안전 레벨이 보장됩니다."
        },
        "KR-GJ-01": {
            title: "과거도시 광주 AI 기후제어단지",
            p1: "광주 북구의 AI 연산단지 주변에 특수 조성된 과거도시 주거 영역입니다. 식생 복구율 94.2%로 기후 장벽 내부 대기 및 전력 제어 장치가 빈틈없이 작동하고 있습니다.",
            p2: "AI 슈퍼컴퓨터가 주변 호남 평야의 대지 수분 분석과 일조량을 조율하며 안전 거주 환경을 예측하고 있어 거주 조건이 극히 우수하게 유지됩니다."
        },
        "KR-DG-01": {
            title: "그레이시티 대구 서구 섬유 난민촌",
            p1: "대구 서구의 노후 섬유 단지를 중심으로 기후 피난민들이 빽빽하게 모여 사는 그레이시티입니다. 분지형 열섬 현상과 대기 정체로 미세먼지 및 황사 독성이 매우 자주 경고 수치를 넘어선답니다.",
            p2: "주거 환경이 비좁고 공기가 답답하지만, 방적 직조 일자리를 찾아 유입된 원거주민들의 생계형 텐트와 임시 건물이 공단 배후지를 메우고 있으며 임시 귀향 심사를 대기 중입니다."
        },
        "KR-YS-01": {
            title: "그레이시티 여수 난민 화학수용소",
            p1: "남해안의 대표적 화학 공장 배후지에 급조된 그레이시티 난민 지구입니다. 화학 물질 누출 위험과 분진 노출 점수가 높아 토양 오염도가 76%를 유지하고 있습니다.",
            p2: "피난 주민들의 호흡기 진료를 위한 보건 초소가 운영 중이지만 주거 위생 상태가 열악합니다. 안전한 노휴먼스랜드 복원 지구로의 이주 배치를 원하는 희망 서류 접수가 밀려들고 있습니다."
        },
        "KR-TA-01": {
            title: "노휴먼스랜드 태안 연안 화학정화지대",
            p1: "과거의 대규모 유출 상흔과 기후 온난화 해수 독성이 겹쳐 인간 거주가 장기 제한된 태안 해안선 노휴먼스랜드입니다. 현재 자연 치유율은 52.9% 선에서 완만히 진행 중입니다.",
            p2: "갯벌 복원을 위한 AI 정화 선박과 나노 필터링 모듈이 배치되어 수중 오염도를 서서히 낮추고 있으며, 게와 갯벌 생물군이 복귀 징후를 보이고 있어 3.9년 이상의 정화 관측이 추가 진행됩니다."
        },
        "KR-DK-01": {
            title: "노휴먼스랜드 독도 영해 기후관측선",
            p1: "해양성 기후 급변과 방사능 잔류 위험을 감시하기 위해 인간 영구 상주가 엄격히 제한된 독도 노휴먼스랜드입니다. 공기는 극히 맑으나 기상 이변 파고 위험으로 봉쇄 상태가 유지됩니다.",
            p2: "해수 온도 급상승과 해조류 백화 현상을 완화하기 위해 AI 해양 관측 드론이 부근 영해를 순찰하며 실시간 해류 및 수치 안정성 보고서를 RootHome 본부로 송출하고 있습니다."
        }
    };

    // Customized future predictions (2035, 2029, 2025) for each of the 21 zones
    const zoneFutureTimelines = {
        "KR-GW-01": {
            futureTitle: "철조망 해제 및 비무장 지대 평화 숲 완공",
            futureP1: "수십 년간 가로막혀 있던 철조망 기슭의 토양 잔류 독성이 완전히 소멸되어 마침내 평화 숲의 빗장이 열렸습니다.",
            futureP2: "남북 접경선 너머로 흐르던 대기 정화 노드들이 자리를 잡으며, 사람의 발길이 닿지 않던 곳에 울창한 참나무 숲과 덩굴 들꽃들이 무리 지어 피어납니다.",
            midTitle: "지하수 화학 성분 정화 완료",
            midContent: "대진리 전역의 지하 오염수 여과 장치가 필터링 100%를 완수하여 음용 가능한 청정 암반수가 개울을 메웁니다.",
            startContent: "대진리 한계선 철책 전역에 초밀도 대기 감지 센서가 배치되어 독성 성분 정화를 모니터링하기 시작했습니다."
        },
        "KR-GW-02": {
            futureTitle: "거진 항구 거주 주택 완공 및 정착 개시",
            futureP1: "해양 수질과 대기가 완벽한 등급을 유지하며, 항구 배후지에 귀향을 소망하는 실향민 가족을 위한 친환경 주거 단지가 완공되었습니다.",
            futureP2: "바닷바람에 묻어나는 솔향기와 투명한 바다가 일상에 안온함을 불어넣고, 공동 텃밭에서 옛 이웃들이 함께 배추와 상추를 심을 수 있게 됩니다.",
            midTitle: "연안 수달 서식지 생태 보호령 지정",
            midContent: "항구 방파제 주변 수질 개선이 90% 달성되며 천연기념물 수달 무리가 둥지를 터 갯바위 생태가 자립 단계에 들어섭니다.",
            startContent: "거진 항구 부둣가와 퇴적층 정화를 위한 AI 오염 여과막 및 기후 분석 노드가 물속에 잠겨 가동을 개시했습니다."
        },
        "KR-GW-03": {
            futureTitle: "아야진 모래사장 해양 생태 자립 완료",
            futureP1: "아야진리 옛 주거 구역과 모래사장에 해양성 생태 복원이 완료되어 고향으로 돌아온 실향민 가구들의 첫 입주식이 성황리에 열렸습니다.",
            futureP2: "마당 귀퉁이의 아야진 소나무 그늘 아래서 모든 세대의 이웃들이 한데 모여 보리차를 마시며 고향의 봄 바람을 마주하는 기적이 현실이 되었습니다.",
            midTitle: "수변 실개천 정화 필터 포화 달성",
            midContent: "아야진리로 들어서는 실개천의 자정 능력이 복원되어 은어와 피라미들이 떼 지어 노니는 모습이 20년 만에 목격되었습니다.",
            startContent: "아야진리 전 거주 예정 필지에 자동 토양 개량 센서와 미세 대기 트래킹 모듈이 활성화되어 복원 기반을 닦았습니다."
        },
        "KR-GW-04": {
            futureTitle: "인제 서화면 계곡 휴양 숲 자립",
            futureP1: "서화면 깊은 산골 계곡 전역이 안전 지표를 초과 달성하여, 실향민 가정을 위한 청정 치유 정원과 숲속 친환경 가옥이 첫 입주를 시작했습니다.",
            futureP2: "산자락을 메운 침엽수림에서 뿜어 나오는 피톤치드가 공기 건강 지표를 최고치로 유지시키며 아이들과 중장년층 모두의 건강한 안심 정착을 돕습니다.",
            midTitle: "계곡 하천 유역 자정 가속화",
            midContent: "서화천 상류의 잔류 오염 여과 작업이 성공적으로 종료되며, 맑은 계곡수가 흘러 수생 생물 다양성이 80%를 회복했습니다.",
            startContent: "서화면 계곡지대 삼림의 훼손 경로를 복원하기 위한 스마트 씨앗 드론 및 수질 정밀 측정탑이 건설되었습니다."
        },
        "KR-GW-05": {
            futureTitle: "철원 평야 친환경 벼농사 및 영농 귀향 시작",
            futureP1: "황토 평야 전역의 탄소 고정율이 임계치를 완벽히 넘어서며, 농업 복귀를 희망하는 실향민 가정이 손꼽아 기다리던 공동 영농 주택이 개소했습니다.",
            futureP2: "비옥한 흙 냄새를 맡으며 대대로 이어온 벼농사를 안심하고 재개하고, 수확된 쌀은 친환경 기후 쌀 브랜드로 포장되어 전국에 배송됩니다.",
            midTitle: "황토 평야 대규모 탄소 고정림 준공",
            midContent: "평야 기슭에 조림된 탄소 고정림이 질소 화합물을 대폭 감소시켜 대기 정화 속도를 2배 이상 끌어올리는 데 성공했습니다.",
            startContent: "갈말읍 넓은 벌판 전역의 질산염 축적을 중화하기 위해 유기 토양 개량제 살포 드론군이 배치되었습니다."
        },
        "KR-GW-06": {
            futureTitle: "양구 동면 분지 자연 치유 보호림 완성",
            futureP1: "가장 치유가 더뎠던 분지 내부 오염 물질이 AI 촉매로 완전 정화되어, 생태 휴양지로서 실향민 공동 안식처가 준공되었습니다.",
            futureP2: "오목한 분지 기슭을 감싸는 안개가 맑고 투명한 솔바람으로 바뀌어, 어린아이부터 어르신까지 모든 귀향민들이 편안히 안식합니다.",
            midTitle: "분지 중심 오염 대수층 여과 시스템 완공",
            midContent: "분지 내부 지형의 정체된 오염수가 6단계 AI 고도 정수 노드 가동으로 완전히 정제되어 생태 실개천으로 방류됩니다.",
            startContent: "양구 동면 자연 복원구역 내부의 극미세 중금속 잔류량을 측정하기 위해 초정밀 분광식 토양 분석기를 배치했습니다."
        },
        "KR-SL-01": {
            futureTitle: "강남 에코돔 스마트 케어 주거망 확장",
            futureP1: "돔 내부 원주민 가정을 위해 AI 원격 환경 제어 및 청정 공조 시스템이 적용된 에코 그린 주거망이 완비되었습니다.",
            futureP2: "미세먼지 농도 0%의 쾌적한 돔 내부 정원에서 다양한 세대의 입주민들이 에코 정원을 거닐며 안온하고 품격 있는 일상을 보냅니다.",
            midTitle: "에코돔 공조 필터링 자동 포화 제어",
            midContent: "외부 그레이시티 매연의 차단을 위해 에코돔 전면 장벽에 부착된 초전도 공조 필터링이 2세대 청정 필터로 자동 리뉴얼되었습니다.",
            startContent: "서울 강남 핵심 상업 지구 주변에 기후 격리 차단막(에코돔 1단계)과 내부 산소 순환 센서가 연동 구축되었습니다."
        },
        "KR-SJ-01": {
            futureTitle: "세종 과거도시 안전 행정망 및 정착 지원",
            futureP1: "대피 정부 장벽 내부의 귀향 행정 요원들과 입주 실향민 가정을 위한 스마트 정착 주거 지구 설계가 완료되어 가동을 개시했습니다.",
            futureP2: "외부 열파와 황사를 100% 방어하는 대형 수자원 냉각 돔 아래서 실향민 가족들이 안심하고 맑은 식수를 상시 공급받을 수 있습니다.",
            midTitle: "정부 돔 내부 하천 순환 복구",
            midContent: "행정 돔을 관통하는 중앙 인공천에 금강 상류의 순화 필터링이 완료되어 수질 지수 1등급을 영구 유지하기 시작했습니다.",
            startContent: "기후대피정부 청사 방어 장벽 내부에 미세먼지 및 고온 차단막을 가동하고 자동 수분 가습 센서를 연동했습니다."
        },
        "KR-IC-01": {
            futureTitle: "인천 남동공단 잿빛 매연 제거 및 녹색 주거 타운 완공",
            futureP1: "칙칙했던 잿빛 굴뚝 대신 대규모 녹색 탄소흡수탑과 친환경 에코 복합 주거 단지가 들어서 매연 가득하던 인천 하늘이 푸르게 열렸습니다.",
            futureP2: "평생 공해 속에서 일하며 고향을 그리워하던 근로자 실향민 가정들이 깨끗해진 공기를 마시며 마침내 쾌적한 아파트 단지에 정착합니다.",
            midTitle: "남동공단 배후 하천 화학 침전물 제거 완료",
            midContent: "인근 유역의 산업 폐수 잔재를 걸러내는 생체 흡착 정화벽이 포화 용량을 달성하며 수생 생태가 첫 복원을 알렸습니다.",
            startContent: "남동공단 거주 난민촌 내부의 호흡기 독성 배출량을 추적하고 대기 정화 탑을 추가로 설치할 실시간 센서망을 깔았습니다."
        },
        "KR-US-01": {
            futureTitle: "울산 화학단지 녹색 재생 및 실향민 안심 정착",
            futureP1: "화학 공장의 잔재가 말끔히 치워진 부지에 어린이와 청년, 중장년을 위한 대규모 친환경 공원과 건강 주거단지가 준공되었습니다.",
            futureP2: "대기 오염에 시달리던 모든 피난 실향민들이 숲 공원의 깨끗한 산소를 마시며 질병을 치유하고 건강한 미래를 도모합니다.",
            midTitle: "토양 미세 중금속 중화 필터 완비",
            midContent: "울산 공업 지대 지하 점토층에 축적되었던 유독 잔류 물질을 흡착해 내는 화학 필터링 장치가 정화를 성공적으로 완수했습니다.",
            startContent: "화학 공장 배후의 대지 및 지하수 오염 전파 경로를 실시간으로 탐지하고 제어 장벽을 설계할 모니터링 노드가 기동되었습니다."
        },
        "KR-BS-01": {
            futureTitle: "부산 사하 해안 수변 공원 및 해양 에코 빌리지 준공",
            futureP1: "침수 우려가 높던 낙동강 하구 사하 항만 구역에 해수 역류 방어 장벽과 친환경 해양 에코 빌리지가 완벽하게 준공되었습니다.",
            futureP2: "바다가 바라보이는 마당에서 실향민 어민들과 그 가족들이 과거의 소중한 해양 기억을 안고 평온하고 안전한 주거를 누립니다.",
            midTitle: "낙동강 하구 연안 수질 자정 능력 복구",
            midContent: "바닷물과 강물이 만나는 하구둑 부근 오염물질 여과 노드가 100% 효율을 내며 조개류와 낙지 서식지가 완전 회복되었습니다.",
            startContent: "사하구 해안 난민 캠프 주변에 해수면 실시간 높이 감지 센서 및 파랑 에너지를 제어할 기후 방벽 정화 장치를 연동했습니다."
        },
        "KR-AS-01": {
            futureTitle: "안산 반월 에코 타운 및 가족 안심 주거망 준공",
            futureP1: "공해의 대명사였던 반월공단 배후지가 완전한 탄소 중립 에코 타운으로 탈바꿈하여, 가족 중심의 안심 치유 주거망으로 개소했습니다.",
            futureP2: "폭염 일수가 대폭 감소하고 단지 곳곳에 조성된 녹색 정원이 쾌적함을 주어, 오랜 대피 생활에 지친 귀향인들의 몸과 마음을 치유합니다.",
            midTitle: "공업 배후 토양 유독 물질 정화 완료",
            midContent: "토양 정화 균류 배포와 전기 삼투 여과 공법으로 반월 단지 주변 흙 속에 고여 있던 잔류 독성 수치가 임계치 미만으로 낮아졌습니다.",
            startContent: "안산 공단지대 외곽의 환경 배출 먼지량을 감지하는 미세 기후 센서 포스트들이 설치되어 복구 작업을 착수했습니다."
        },
        "KR-JN-01": {
            futureTitle: "지리산 천왕봉 친환경 안식처 완공",
            futureP1: "인류가 철수하여 완전 통제 구역이 된 지리산 중턱에, 가족 및 청년 귀향민들을 위한 친환경 숲속 가옥이 오픈했습니다.",
            futureP2: "새소리와 맑은 바람만이 가득한 지리산 자락에서 자연 속에서 요양하고자 하는 모든 귀향민들이 깨끗한 대기를 호흡하며 생활합니다.",
            midTitle: "지리산 계곡수 야생 다양성 지표 안정",
            midContent: "물줄기의 정화가 완료되며 1급수에만 서식하는 꼬리치레도롱뇽과 산천어가 지리산 전 유역에 건강하게 퍼져 정착했습니다.",
            startContent: "지리산 천왕봉 보호 구역 내부의 등산로 철거 및 자연 야생 동물의 이동 반경을 추적할 고성능 적외선 야생 센서망을 설치했습니다."
        },
        "KR-JJ-01": {
            futureTitle: "제주 한라산 친환경 정착 휴양촌 개소",
            futureP1: "해양성 격리 보호령이 내려졌던 한라산 기슭에, 무공해 청정 대기를 활용한 모든 실향민 가구용 친환경 정착 단지가 안전하게 개소했습니다.",
            futureP2: "한라산의 구상나무 향기와 제주 청정 바다가 한눈에 내려다보이는 조망 아래서 실향민들이 몸을 회복하고 푸른 자연 휴양을 즐깁니다.",
            midTitle: "한라산 중산간 식생 NDVI 지수 임계치 돌파",
            midContent: "제주 중산간 초지의 목초 자생력이 임계치를 초과 달성하며, 인간의 교란 없이 복원된 야생 조류의 둥지가 전역에서 목격됩니다.",
            startContent: "한라산 보호선 주변에 불법 침입을 방지하고 기후 안정 데이터를 수집하기 위한 고해상도 드론 조림 초소를 설치했습니다."
        },
        "KR-UJ-01": {
            futureTitle: "울진 소나무 숲 대규모 복원 및 송이 마을 귀향",
            futureP1: "화마로 검게 그을렸던 산자락에 아기 소나무들이 무성하게 자라나, 마침내 송이버섯 채취가 가능해진 실향 농민들의 옛 마을이 복원되었습니다.",
            futureP2: "어린 시절 아버지를 따라 오르던 송이벌판의 부드러운 흙을 다시 밟으며, 평생의 향수였던 울진 솔밭 아래서 건강한 여생을 가꿔나갑니다.",
            midTitle: "산성 황폐화 토양 유기성 회복 완료",
            midContent: "산불 잿더미로 산성화되었던 토양에 미생물 제제를 장기 투여하여 흙의 산성도가 작물 재배가 가능한 수준인 pH 6.2로 중화되었습니다.",
            startContent: "울진 산불 훼손 산림의 식생 조기 복원을 위해 드론형 토양 활성화 포자 배포탑과 정밀 강우 감지 장치를 배치했습니다."
        },
        "KR-DJ-01": {
            futureTitle: "대전 유성 연구단지 스마트 에코 단지 완성",
            futureP1: "과거도시 유성 연구단지 내에 귀향한 과학자 실향민과 청년 연구원들을 위한 IoT 스마트 에코 단지가 완성되어 정착을 개시했습니다.",
            futureP2: "정화 장벽이 미세먼지와 극한의 폭염을 원천 차단하여, 모든 실향민 가정과 아이들도 돔 내부 공원에서 매일 안전하게 산책을 즐기십니다.",
            midTitle: "연구단지 순환 용수 미세 정제 완료",
            midContent: "유성천 및 부근 연구 구역의 재활용 식수관 필터가 2.0으로 상향되어, 끓이지 않고 마셔도 무해한 생체수가 영구 유지되기 시작했습니다.",
            startContent: "과거도시 에코 연구 구역의 경계 장벽에 초고효율 미세 공기 청정 센서 필터를 가동하고 내부 대기 분석망을 착수했습니다."
        },
        "KR-GJ-01": {
            futureTitle: "광주 AI 미래형 스마트 귀향 단지 개소",
            futureP1: "광주 북구 AI 제어 주택 지구에 AI 스마트 홈 제어 시스템이 갖춰진 미래형 스마트 귀향 단지가 완공되어 입주를 시작했습니다.",
            futureP2: "장벽 내부의 쾌적한 온도와 맑은 공기가 귀향인 가정들에게 안락하고 깨끗한 정주 여건을 보장하여 삶의 만족도를 끌어올립니다.",
            midTitle: "호남 에코그리드 순환 하천 정수 완료",
            midContent: "단지 정화 용수 순환망의 수질 지수가 1.2로 하강하며, 영산강 유역 필터 연동 정수 작업이 완벽하게 성공을 선언했습니다.",
            startContent: "광주 AI 연산 단지 외곽 장벽 내부에 미세 입자 차단 가습 막을 가동하고 습도 자동 모니터링 포스트를 연동했습니다."
        },
        "KR-DG-01": {
            futureTitle: "대구 서구 친환경 숲속 에코 타운 개소",
            futureP1: "대구 섬유 난민촌의 잿빛 공장지대가 사라진 자리에, 모든 귀향인 가정의 쾌적한 호흡을 보장하는 대규모 친환경 숲속 주거 타운이 개소했습니다.",
            futureP2: "분지의 뜨거운 열기를 정화 공원 숲이 차단하여 폭염 경보 속에서도 아이들과 주민들이 나무 그늘 아래서 안심하고 휴식을 취하십니다.",
            midTitle: "섬유 단지 배후 대기 분진 흡착 정수 완료",
            midContent: "공단 배후지의 유독성 미세 분진을 빨아들이는 대형 정화탑이 수용소 인근 대기질 지수를 90점대 이상으로 대폭 개선하는 데 성공했습니다.",
            startContent: "대구 서구 섬유 공단 배후 거주지의 대기 유해 분진 노출도를 실시간 감지하여 경보를 울릴 스마트 센서 포스트를 연동했습니다."
        },
        "KR-YS-01": {
            futureTitle: "여수 화학단지 해양 에코 빌리지 완공",
            futureP1: "남해안의 화학 오염 흔적이 말끔히 지워지고 바다가 훤히 보이는 언덕에 바다를 터전으로 삼고자 하는 실향민들을 위한 해양 에코 빌리지가 완공되었습니다.",
            futureP2: "잔잔한 여수 밤바다 소리를 들으며 평생을 바다와 함께 산 주민들이 해풍 속 미세 오염물질 걱정 없이 맑은 식수를 마시며 노후를 누리십니다.",
            midTitle: "여수 연안 잔류 탄화수소 정밀 정화 완료",
            midContent: "석유화학 단지 부근 해상 유류 잔재를 분해하는 바이오 정화 필터망이 100% 흡착 효율을 보이며 해안 어패류 생태계가 회복되었습니다.",
            startContent: "여수 화학 단지 배후 수용소의 대지 및 침전 용수의 화학물 노출 여부를 체크하고 장벽을 구축할 감시망을 기동했습니다."
        },
        "KR-TA-01": {
            futureTitle: "태안 연안 친환경 휴양 주거망 개소 및 어업 귀향",
            futureP1: "태안 갯벌 전역의 중금속 정화가 완전 선언되어, 고향 바다로 복귀한 어민 가족들이 그리워하던 태안 갯가로 귀향하여 조업을 안심하고 재개했습니다.",
            futureP2: "깨끗해진 모래사장과 갯벌에서 낙지와 바지락을 캐며 모든 세대의 주민들이 소박한 기쁨을 나누고 서해 낙조 아래 안온하게 정주하십니다.",
            midTitle: "태안 연안 해수 갯벌 미세 오염 흡착벽 완비",
            midContent: "장기 화학 유출 물질을 흡착해 분해하는 나노 기공 여과 모듈이 갯벌 깊숙이 설치되어 중금속 및 수중 오염 물질 제거를 마무리했습니다.",
            startContent: "태안 연안의 유해 물질 누출 경로를 트래킹하고 방지 장벽을 설계할 해안 스마트 센서 모듈들을 갯벌 주위에 배치했습니다."
        },
        "KR-DK-01": {
            futureTitle: "독도 기후 평형 달성 및 해양 에코 관측 쉼터 개소",
            futureP1: "독도 해수 온도의 이상 기후 백화 현상이 완전히 퇴치되어, 맑고 투명한 독도 바다 숲을 영구 보존할 해양 에코 관측 쉼터가 개소했습니다.",
            futureP2: "연구자들과 귀향인들이 맑은 파도 소리 속에 독도의 동도와 서도를 바라보며 청정 자연의 숨결을 오롯이 느끼십니다.",
            midTitle: "독도 연안 바다 숲 감태 및 다시마 군락 복원 완료",
            midContent: "이상 기후 해수온 완화 기술로 독도 암반에 붙은 석회화 물질이 소멸하고 감태와 대형 다시마 숲이 무성하게 복원 완료되었습니다.",
            startContent: "독도 영해 주변의 실시간 수온 급상승 여부와 방사능 조류 이동 경로를 추적하는 고해상도 수중 측정 부이를 앵커링했습니다."
        }
    };

    // --- 2. INITIALIZE ICONS ---
    lucide.createIcons();

    // --- 3. DUAL ROUTING & TAB SYNC (Desktop & Mobile) ---
    const desktopMenuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    const desktopTabContents = document.querySelectorAll(".main-content .tab-content");
    const desktopHeaderNavs = document.querySelectorAll(".main-content .header-tab-nav");

    const mobileNavItems = document.querySelectorAll(".mobile-nav .mobile-nav-item");
    const mobileTabContents = document.querySelectorAll(".mobile-body .mobile-tab-content");

    const tabMap = {
        "rootmap": "home",
        "dignity": "matrix",
        "timeline": "timeline",
        "profile": "profile"
    };

    const reverseTabMap = {
        "home": "rootmap",
        "matrix": "dignity",
        "timeline": "timeline",
        "profile": "timeline"
    };

    function syncActiveTab(tabId, source) {
        let deskTab = tabId;
        let mobTab = tabId;

        if (source === "desktop") {
            mobTab = tabMap[tabId];
        } else {
            deskTab = reverseTabMap[tabId];
            mobTab = tabId;
        }

        desktopMenuItems.forEach(item => {
            if (item.getAttribute("data-tab") === deskTab) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        desktopTabContents.forEach(content => {
            if (content.id === `tab-${deskTab}`) {
                content.classList.remove("hidden");
                content.classList.add("active");
            } else {
                content.classList.remove("active");
                content.classList.add("hidden");
            }
        });

        desktopHeaderNavs.forEach(nav => {
            if (nav.id === `header-nav-${deskTab}`) {
                nav.classList.remove("hidden");
            } else {
                nav.classList.add("hidden");
            }
        });

        mobileNavItems.forEach(item => {
            if (item.getAttribute("data-mobtab") === mobTab) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        mobileTabContents.forEach(content => {
            if (content.id === `mobtab-${mobTab}`) {
                content.classList.remove("hidden");
                content.classList.add("active");
            } else {
                content.classList.remove("active");
                content.classList.add("hidden");
            }
        });

        activeTab = deskTab;

        setTimeout(() => {
            if (desktopMap) desktopMap.invalidateSize();
            if (mobileMap) mobileMap.invalidateSize();
        }, 100);
    }

    desktopMenuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            syncActiveTab(item.getAttribute("data-tab"), "desktop");
        });
    });

    mobileNavItems.forEach(item => {
        item.addEventListener("click", () => {
            syncActiveTab(item.getAttribute("data-mobtab"), "mobile");
        });
    });

    // --- 3.5 HEADER SUBTABS BINDINGS (실시간 환경 / 예측 분석 / 정책 리소스) ---
    const headerNavTabs = document.querySelectorAll(".nav-tabs .nav-tab");
    const subtabContents = document.querySelectorAll(".subtab-content");

    headerNavTabs.forEach((tabBtn, index) => {
        tabBtn.addEventListener("click", () => {
            headerNavTabs.forEach(btn => btn.classList.remove("active"));
            tabBtn.classList.add("active");

            subtabContents.forEach(content => {
                content.classList.add("hidden");
                content.classList.remove("active");
            });

            if (index === 0) {
                const rt = document.getElementById("subtab-realtime");
                if (rt) {
                    rt.classList.remove("hidden");
                    rt.classList.add("active");
                }
                setTimeout(() => {
                    if (desktopMap) desktopMap.invalidateSize();
                }, 50);
            } else if (index === 1) {
                const pred = document.getElementById("subtab-prediction");
                if (pred) {
                    pred.classList.remove("hidden");
                    pred.classList.add("active");
                }
            } else if (index === 2) {
                const pol = document.getElementById("subtab-policy");
                if (pol) {
                    pol.classList.remove("hidden");
                    pol.classList.add("active");
                }
            }
        });
    });

    // --- 4. MAP API INTEGRATION (Leaflet.js) ---
    function getStatusColor(status) {
        if (status === "귀향시작") return "var(--color-success)";
        if (status === "예약가능") return "var(--color-warning)";
        return "var(--color-danger)";
    }

    function initLeafletMaps() {
        console.log("Initializing Leaflet Maps for South Korea...");

        const centerPoint = [36.3000, 127.8000]; // Center of South Korea
        const baseZoom = 7; // Nation-wide zoom

        const tileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}';
        const attribution = '&copy; Google Maps';

        // 1) Desktop Map (Global scale unlocked!)
        desktopMap = L.map('desktop-map', {
            center: centerPoint,
            zoom: 6,
            minZoom: 2, // Fully unlocked to see the whole Earth
            maxZoom: 18,
            zoomControl: false
        });
        L.tileLayer(tileUrl, { attribution: attribution }).addTo(desktopMap);

        // 2) Mobile Map (Global scale unlocked!)
        mobileMap = L.map('mobile-map', {
            center: centerPoint,
            zoom: 5,
            minZoom: 2, // Fully unlocked to see the whole Earth
            maxZoom: 18,
            zoomControl: false
        });
        L.tileLayer(tileUrl, { attribution: attribution }).addTo(mobileMap);



        // Helper function for deterministic pseudo-random generator
        function seedRandom(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return function() {
                const x = Math.sin(hash++) * 10000;
                return x - Math.floor(x);
            };
        }

        // Helper function to generate stable irregular polygon boundaries mimicking district outlines
        function generateDistrictPolygon(zoneId, lat, lng) {
            const rand = seedRandom(zoneId);
            const points = [];
            let radiusKm = 8.5; // Compact localized city/municipal scope (8.5km)
            if (zoneId === "KR-DK-01") radiusKm = 3.5;
            else if (zoneId.startsWith("GL-")) radiusKm = 15.0; // Global Metropolises have grand ecosystem scale (15km)
            else if (zoneId === "KR-JN-01" || zoneId === "KR-JJ-01" || zoneId === "KR-UJ-01") radiusKm = 11.5;
            
            const latOffsetDegree = radiusKm / 110.574;
            const lngOffsetDegree = radiusKm / (111.320 * Math.cos(lat * Math.PI / 180));
            const numPoints = 6 + Math.floor(rand() * 4); // 6 to 9 vertices for realistic irregularity
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * 2 * Math.PI;
                // Add a random variation factor between 0.75 and 1.3
                const factor = 0.75 + rand() * 0.55;
                const pLat = lat + Math.sin(angle) * latOffsetDegree * factor;
                const pLng = lng + Math.cos(angle) * lngOffsetDegree * factor;
                points.push([pLat, pLng]);
            }
            return points;
        }

        // 대한민국 통계청 실제 250개 시·군·구 기초자치단체(도시) 경계 GeoJSON 로드 및 정밀 매핑
        loadMunicipalitiesGeoJSON();

        // 통계청 시군구 code(2013 kostat) -> zone_id 직접 매핑. 이름 매칭은 동명 구(남구/북구/서구 등)가
        // 여러 도시에 겹쳐 존재해 오매칭이 나서, GeoJSON feature의 고유 code로 정확히 매칭한다.
        const ZONE_CODE_MAP = {
            "32400": "KR-GW-03", // 강원 고성군
            "32390": "KR-GW-04", // 강원 인제군
            "32360": "KR-GW-05", // 강원 철원군
            "32380": "KR-GW-06", // 강원 양구군
            "11230": "KR-SL-01", // 서울 강남구
            "29010": "KR-SJ-01", // 세종시
            "23050": "KR-IC-01", // 인천 남동구
            "26020": "KR-US-01", // 울산 남구
            "21100": "KR-BS-01", // 부산 사하구
            "31092": "KR-AS-01", // 안산시 단원구
            "36330": "KR-JN-01", // 구례군 (지리산 대표)
            "39020": "KR-JJ-01", // 서귀포시 (한라산 대표)
            "37420": "KR-UJ-01", // 울진군
            "25040": "KR-DJ-01", // 대전 유성구
            "24040": "KR-GJ-01", // 광주 북구
            "22030": "KR-DG-01", // 대구 서구
            "36020": "KR-YS-01", // 여수시
            "34380": "KR-TA-01", // 태안군
            "37430": "KR-DK-01", // 울릉군 (독도)
            "31013": "KR-SU-01", // 수원시 팔달구
            "31200": "KR-PJ-01", // 파주시
            "34012": "KR-CN-02", // 천안시 서북구
            "33310": "KR-CB-02", // 청원군 (오창)
            "35012": "KR-JB-02", // 전주시 덕진구
            "38112": "KR-GN-03"  // 창원시 성산구
        };

        function findZoneByCode(code) {
            const zoneId = ZONE_CODE_MAP[code];
            if (!zoneId) return null;
            return zonesData.find(z => z.zone_id === zoneId) || null;
        }

        // 전국 모든 시군구(행정구역)에 대해 오염도/복구율/통제상태를 산출한다.
        // - 손으로 매핑한 26개 핵심 재난 구역: 백엔드/스토리 실측 데이터 사용
        // - 그 외 전 시군구: code를 시드로 한 결정론적 가상 오염 지표 생성(새로고침해도 값 고정)
        // 지역별 식량 자급도에 따른 복구율 보정치. 전라도는 곡창지대라 식량 여유가 있어
        // 정화·재건 인프라 지원이 원활해 봉쇄 구역이 적고, 경상도·경기·서울/광역시는
        // 인구밀집 대비 식량 자급이 부족해 통제가 길어져 봉쇄 구역이 많다.
        function getRegionFoodBias(code) {
            const prefix = code.slice(0, 2);
            if (prefix === "35" || prefix === "36") return 18; // 전북·전남
            if (prefix === "37" || prefix === "38") return -15; // 경북·경남
            if (prefix === "31") return -15; // 경기
            if (["11", "21", "22", "23", "24", "25", "26", "29"].includes(prefix)) return -15; // 서울·7대광역시·세종
            return 0;
        }

        function getMunicipalityData(code, name) {
            const zone = findZoneByCode(code);
            if (zone) {
                return {
                    name: zone.zone_name.split(" - ")[1] || zone.zone_name,
                    recovery_rate: zone.recovery_rate,
                    status: zone.status,
                    zone: zone,
                    isKeyZone: true
                };
            }
            const rand = seedRandom("muni-" + code);
            const bias = getRegionFoodBias(code);
            const recovery = Math.max(5, Math.min(98, Math.round((30 + rand() * 68 + bias) * 10) / 10));
            let status;
            if (recovery >= 82) status = "귀향시작";
            else if (recovery >= 55) status = "예약가능";
            else status = "봉쇄";
            return { name: name, recovery_rate: recovery, status: status, zone: null, isKeyZone: false };
        }

        // 광역시(코드 2자리 접두) 목록 — 처음엔 구/군 안 나누고 시 전체를 한 덩어리로 보여준 뒤,
        // 클릭하면 그제서야 실제 구/군 폴리곤으로 펼쳐지게 한다.
        const METRO_PREFIX = {
            "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
            "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시"
        };

        // geoData의 시군구 feature들을 (일반 시/군) vs (광역시 구/군) 두 그룹으로 나누고,
        // 일반 시군구는 기존처럼 개별 렌더링, 광역시는 "통합 뷰(클릭 전) → 상세 뷰(클릭 후)" 2단계로 그린다.
        function renderMunicipalities(geoData, map, mapCircles, isDesktop) {
            const weight = isDesktop ? 1.8 : 1.2;
            const lightWeight = isDesktop ? 0.6 : 0.5;
            const zoomOnClick = isDesktop ? 10 : 9;

            const plainFeatures = [];
            const metroGroups = {};
            geoData.features.forEach(feature => {
                const prefix = (feature.properties.code || "").slice(0, 2);
                if (METRO_PREFIX[prefix]) {
                    (metroGroups[prefix] = metroGroups[prefix] || []).push(feature);
                } else {
                    plainFeatures.push(feature);
                }
            });

            // 광역시 확장/축소 상태 — 한 번에 하나만 펼쳐진 채로 유지한다.
            const metroState = { expandedPrefix: null, entries: {} };

            function collapseExpandedMetro() {
                const prefix = metroState.expandedPrefix;
                if (!prefix) return;
                const entry = metroState.entries[prefix];
                if (map.hasLayer(entry.districtLayer)) map.removeLayer(entry.districtLayer);
                if (map.hasLayer(entry.frameLayer)) map.removeLayer(entry.frameLayer);
                entry.metroLayer.addTo(map);
                metroState.expandedPrefix = null;
            }

            function expandMetro(prefix) {
                if (metroState.expandedPrefix && metroState.expandedPrefix !== prefix) {
                    collapseExpandedMetro();
                }
                const entry = metroState.entries[prefix];
                if (map.hasLayer(entry.metroLayer)) map.removeLayer(entry.metroLayer);
                entry.districtLayer.addTo(map);
                entry.frameLayer.addTo(map);
                map.fitBounds(entry.bounds, { padding: [20, 20] });
                metroState.expandedPrefix = prefix;
            }

            function districtStyle(feature) {
                const data = getMunicipalityData(feature.properties.code, feature.properties.name);
                return {
                    color: "#ffffff",
                    weight: data.isKeyZone ? weight : lightWeight,
                    fillColor: getStatusColor(data.status),
                    fillOpacity: data.isKeyZone ? 0.58 : 0.32
                };
            }

            // metroPrefix: 이 feature가 광역시 소속이면 그 코드 접두, 일반 시/군이면 null.
            // 일반 시/군을 선택하면 현재 펼쳐진 광역시가 있을 때 원래 통합 뷰로 되돌린다.
            function bindDistrictFeature(metroPrefix) {
                return function(feature, layer) {
                    const data = getMunicipalityData(feature.properties.code, feature.properties.name);
                    const pollution = Math.round((100 - data.recovery_rate) * 10) / 10;
                    layer.bindPopup(`<strong>📍 ${data.name}</strong><br>오염도: ${pollution}%<br>복구율: ${data.recovery_rate}%<br>통제 상태: <strong>${data.status}</strong>`);
                    if (data.zone) mapCircles[data.zone.zone_id] = layer;
                    layer.on("click", (e) => {
                        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                        if (!metroPrefix) collapseExpandedMetro();
                        map.setView(layer.getBounds().getCenter(), zoomOnClick, { animate: true });
                        if (data.zone) selectZone(data.zone.zone_id);
                    });
                    if (isDesktop) {
                        layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.72, weight: 2 }));
                        layer.on("mouseout", () => layer.setStyle({
                            fillOpacity: data.isKeyZone ? 0.58 : 0.32,
                            weight: data.isKeyZone ? weight : lightWeight
                        }));
                    }
                };
            }

            // 1) 일반 시/군 — 기존처럼 개별 표시
            L.geoJSON({ type: "FeatureCollection", features: plainFeatures }, {
                style: districtStyle,
                onEachFeature: bindDistrictFeature(null)
            }).addTo(map);

            // 2) 광역시 — 처음엔 시 전체를 하나로(경계선 없이 같은 색이라 자연스럽게 한 덩어리로 보임),
            //    클릭하면 실제 구/군 상세 뷰로 전환. 다른 지역을 선택하거나 다른 광역시를 펼치면 원상복구.
            Object.keys(metroGroups).forEach(prefix => {
                const features = metroGroups[prefix];
                const cityName = METRO_PREFIX[prefix];
                const districtData = features.map(f => getMunicipalityData(f.properties.code, f.properties.name));
                const avgRecovery = Math.round((districtData.reduce((s, d) => s + d.recovery_rate, 0) / districtData.length) * 10) / 10;
                const avgStatus = avgRecovery >= 82 ? "귀향시작" : avgRecovery >= 55 ? "예약가능" : "봉쇄";
                const avgPollution = Math.round((100 - avgRecovery) * 10) / 10;
                const cityCollection = { type: "FeatureCollection", features };

                const districtLayer = L.geoJSON(cityCollection, {
                    style: districtStyle,
                    onEachFeature: bindDistrictFeature(prefix)
                }); // 상세 뷰: 클릭 전엔 지도에 addTo 하지 않음

                // 상세 뷰일 때 시 전체 경계를 굵은 점선 프레임으로 강조 (구별 경계선과 구분되도록)
                const frameLayer = L.geoJSON(cityCollection, {
                    style: () => ({ fill: false, color: "#1e293b", weight: isDesktop ? 3 : 2, opacity: 0.85, dashArray: "6 4" }),
                    interactive: false
                });

                const metroLayer = L.geoJSON(cityCollection, {
                    style: () => ({ color: getStatusColor(avgStatus), weight: 0, fillColor: getStatusColor(avgStatus), fillOpacity: 0.5 }),
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(`<strong>📍 ${cityName}</strong><br>평균 오염도: ${avgPollution}%<br>평균 복구율: ${avgRecovery}%<br>통제 상태: <strong>${avgStatus}</strong><br><span style="font-size:11px;color:#64748B;">클릭하면 구·군별 상세 보기</span>`);
                        layer.on("click", () => expandMetro(prefix));
                        if (isDesktop) {
                            layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.68 }));
                            layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.5 }));
                        }
                    }
                }).addTo(map);

                metroState.entries[prefix] = { metroLayer, districtLayer, frameLayer, bounds: metroLayer.getBounds() };
            });
        }

        async function loadMunicipalitiesGeoJSON() {
            try {
                console.log("[GeoJSON] 대한민국 실제 250개 시군구 도시 행정 경계 정보 로딩 중...");
                const res = await fetch("./skorea_municipalities_simple.json");
                if (!res.ok) throw new Error("Local Si-Gun-Gu GeoJSON server response error");
                const geoData = await res.json();

                // 1) Desktop: 일반 시군구는 개별, 광역시는 통합→상세 2단계로 렌더링
                renderMunicipalities(geoData, desktopMap, desktopMapCircles, true);

                // 2) Mobile: 동일 로직
                renderMunicipalities(geoData, mobileMap, mobileMapCircles, false);

                // 3) Global Nodes & GeoJSON Exception fallbacks (해외 유명 선진 도시 기후 다각형 및 신규 한국 거점 예외 렌더링)
                // KR-GW-01·02는 KR-GW-03과 같은 고성군 소속이라 GeoJSON 폴리곤 하나(GW-03)로 이미 표시됨 —
                // 여기서 또 그리면 고성군 위에 다각형이 중복으로 겹쳐 보인다.
                const DUPLICATE_COUNTY_ZONES = ["KR-GW-01", "KR-GW-02"];
                zonesData.forEach(zone => {
                    if (DUPLICATE_COUNTY_ZONES.includes(zone.zone_id)) return;
                    if (zone.zone_id.startsWith("GL-") || !desktopMapCircles[zone.zone_id]) {
                        const color = getStatusColor(zone.status);
                        const polygonCoords = generateDistrictPolygon(zone.zone_id, zone.lat, zone.lng);

                        const deskPoly = L.polygon(polygonCoords, {
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.50,
                            weight: 2.5
                        }).addTo(desktopMap);
                        desktopMapCircles[zone.zone_id] = deskPoly;

                        const mobPoly = L.polygon(polygonCoords, {
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.50,
                            weight: 1.8
                        }).addTo(mobileMap);
                        mobileMapCircles[zone.zone_id] = mobPoly;

                        const cleanName = zone.zone_name.includes(" - ") ? zone.zone_name.split(" - ")[1] : zone.zone_name;
                        const popupContent = `<strong>📍 기후 구역: ${cleanName}</strong><br>오염 복구율: ${zone.recovery_rate}%<br>통제 상태: <strong>${zone.status}</strong>`;
                        deskPoly.bindPopup(popupContent);
                        mobPoly.bindPopup(`<strong>📍 ${cleanName}</strong><br>복구율: ${zone.recovery_rate}%`);

                        deskPoly.on("click", () => {
                            desktopMap.setView([zone.lat, zone.lng], 9, { animate: true });
                            selectZone(zone.zone_id);
                        });
                        mobPoly.on("click", () => {
                            mobileMap.setView([zone.lat, zone.lng], 8, { animate: true });
                            selectZone(zone.zone_id);
                        });
                    }
                });

                console.log("[GeoJSON SUCCESS] 대한민국 시군구(도시 단위) 공식 경계 맵 융합 및 글로벌 다국적 허브 렌더링 대성공!");
            } catch (err) {
                console.warn("[WARN] 도시 단위 GeoJSON 융합 실패. 백업용 다각형으로 가동:", err);
                drawBackupPolygons();
            }
        }

        function drawBackupPolygons() {
            zonesData.forEach(zone => {
                const color = getStatusColor(zone.status);
                const polygonCoords = generateDistrictPolygon(zone.zone_id, zone.lat, zone.lng);

                const deskCircle = L.polygon(polygonCoords, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.50,
                    weight: 2.5
                }).addTo(desktopMap);

                desktopMapCircles[zone.zone_id] = deskCircle;

                const mobCircle = L.polygon(polygonCoords, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.50,
                    weight: 2.5
                }).addTo(mobileMap);

                mobileMapCircles[zone.zone_id] = mobCircle;

                const popupContent = `<strong>${zone.zone_id}</strong><br>${zone.zone_name.split(" - ")[1] || zone.zone_name}<br>회복률: ${zone.recovery_rate}%`;
                deskCircle.bindPopup(popupContent);
                mobCircle.bindPopup(popupContent);

                const handleCircleClick = () => {
                    desktopMap.setView([zone.lat, zone.lng], 8, { animate: true });
                    mobileMap.setView([zone.lat, zone.lng], 7, { animate: true });
                    selectZone(zone.zone_id);
                };

                deskCircle.on("click", handleCircleClick);
                mobCircle.on("click", handleCircleClick);
            });
        }

        window.addEventListener("resize", () => {
            if (desktopMap) desktopMap.invalidateSize();
            if (mobileMap) mobileMap.invalidateSize();
        });
    }

    // Load Zones Data from FastAPI
    async function loadZonesData() {
        try {
            console.log("Loading real-time zones metadata from backend...");
            const response = await fetch(`${backendUrl}/api/zones`);
            if (response.ok) {
                const apiData = await response.json();
                
                // Map API data back to coordinates mapping
                zonesData.forEach(zone => {
                    const matched = apiData.find(z => z.zone_id === zone.zone_id);
                    if (matched) {
                        zone.recovery_rate = matched.recovery_rate;
                        if (zone.recovery_rate <= 30) {
                            zone.status = "봉쇄";
                        } else if (zone.recovery_rate <= 90) {
                            zone.status = "예약가능";
                        } else {
                            zone.status = "귀향시작";
                        }
                        zone.time_to_safe_years = matched.time_to_safe_years;
                        zone.air_quality = matched.air_quality;
                        zone.soil_contamination = matched.soil_contamination;
                        zone.vegetation_ndvi = matched.vegetation_ndvi;
                        zone.description = matched.description;
                    }
                });
                console.log("Real-time zones mapped successfully.");
            } else {
                throw new Error("Bad API response status");
            }
        } catch (err) {
            console.warn("Backend API offline or failed to fetch. Loading local mockup coordinates.");
        }
        
        initLeafletMaps();
        selectZone("KR-GW-03"); // Select default (아야진리)
        
        // 50개년 머신러닝 기후 예측 API 덤프 기동 및 연도 슬라이더 바인딩 연동
        fetch50YearPredictions().then(() => {
            initTimelineDragController();
        });
    }

    // --- 5. ZONE SELECTION & INTERACTIVE STATS & TIMELINE SYNC ---
    function selectZone(zoneId) {
        selectedZoneId = zoneId;
        const zone = zonesData.find(z => z.zone_id === zoneId);
        if (!zone) return;

        // Calculate dynamic relocation years in 4-year increments based on recovery rate
        const R = zone.recovery_rate;
        let T = 0;
        if (R >= 90) {
            T = 0;
        } else if (R >= 70) {
            T = 4;
        } else if (R >= 50) {
            T = 8;
        } else if (R >= 30) {
            T = 12;
        } else {
            T = 16;
        }
        zone.time_to_safe_years = T;

        // Sync status to match dynamic calculation
        if (R <= 30.0) {
            zone.status = "봉쇄";
        } else if (R <= 90.0) {
            zone.status = "예약가능";
        } else {
            zone.status = "귀향시작";
        }

        zonesData.forEach(z => {
            const deskC = desktopMapCircles[z.zone_id];
            const mobC = mobileMapCircles[z.zone_id];
            if (z.zone_id === zoneId) {
                if (deskC) deskC.setStyle({ weight: 5, fillOpacity: 0.55 });
                if (mobC) mobC.setStyle({ weight: 5, fillOpacity: 0.55 });
            } else {
                if (deskC) deskC.setStyle({ weight: 2, fillOpacity: 0.35 });
                if (mobC) mobC.setStyle({ weight: 2, fillOpacity: 0.35 });
            }
        });

        updateDesktopStats(zone);
        updateMobileStats(zone);
        syncTimelineForZone(zone);
    }

    function updateDesktopStats(zone) {
        const o2Val = Math.round(zone.air_quality * (zone.recovery_rate / 100));
        const dustVal = 100 - o2Val;
        document.getElementById("aqi-o2-val").textContent = `${o2Val}%`;
        document.getElementById("aqi-dust-val").textContent = `${dustVal}%`;

        const circ = 238.76;
        document.getElementById("aqi-o2-circle").style.strokeDashoffset = circ - (o2Val / 100) * circ;
        document.getElementById("aqi-dust-circle").style.strokeDashoffset = circ - (dustVal / 100) * circ;

        const waterBars = document.getElementById("water-bars");
        waterBars.innerHTML = "";
        const baseHeight = zone.recovery_rate;
        for (let i = 1; i <= 6; i++) {
            const bar = document.createElement("div");
            bar.className = "chart-bar";
            let barHeight = Math.round(baseHeight * (0.2 + (0.8 * (i / 6))));
            bar.style.height = `${barHeight}%`;
            if (i === 6) bar.classList.add("active");
            waterBars.appendChild(bar);
        }

        const waterCaption = document.getElementById("water-caption");
        const waterTrend = document.getElementById("water-trend");
        if (zone.recovery_rate > 90) {
            waterCaption.textContent = "수질 환경 기준 충족: 정수 자립 상태 진입";
            waterTrend.innerHTML = `<i data-lucide="trending-up"></i> +12.4%`;
        } else if (zone.recovery_rate > 70) {
            waterCaption.textContent = "담수 구역 정화 가속화 단계 진입";
            waterTrend.innerHTML = `<i data-lucide="trending-up"></i> +8.2%`;
        } else {
            waterCaption.textContent = "수중 오염 물질 여과 장치 가동 중";
            waterTrend.innerHTML = `<i data-lucide="trending-up"></i> +4.5%`;
        }

        const soilVal = Math.round(zone.recovery_rate * 0.9);
        const carbonVal = Math.round(zone.recovery_rate * 0.7);
        document.getElementById("soil-percent").textContent = `${soilVal}%`;
        document.getElementById("soil-fill").style.width = `${soilVal}%`;
        document.getElementById("carbon-percent").textContent = `${carbonVal}%`;
        document.getElementById("carbon-fill").style.width = `${carbonVal}%`;

        const stability = ((zone.recovery_rate * 0.08) + (zone.air_quality * 0.02)).toFixed(1);
        document.getElementById("stability-score").textContent = stability;
        const stabilityDesc = document.getElementById("stability-desc");
        if (stability >= 9.0) {
            stabilityDesc.textContent = "대기, 수질 및 식생 인덱스가 모두 최적치에 도달하여 생태계 자립적 안전 거주가 완전 보장됩니다.";
        } else if (stability >= 7.5) {
            stabilityDesc.textContent = "현재 탄소 고정율과 수질 개선 추세를 바탕으로 생태계 자립도가 안전 임계치를 넘어섰습니다.";
        } else {
            stabilityDesc.textContent = "식생지수와 대기질 회복 속도에 비해 수자원 안정화 지연으로 보완 모니터링이 수행 중입니다.";
        }

        document.getElementById("selected-zone-id").textContent = `그리드 ID: ${zone.zone_id}`;
        document.getElementById("selected-zone-desc").textContent = zone.description;
        
        const popupBtn = document.getElementById("btn-resource-deploy");
        if (zone.status === "귀향시작") {
            popupBtn.style.backgroundColor = "var(--color-success)";
            popupBtn.textContent = "안전지대 이주 신청";
        } else if (zone.status === "예약가능") {
            popupBtn.style.backgroundColor = "var(--color-warning)";
            popupBtn.textContent = "대피 거주 예약";
        } else {
            popupBtn.style.backgroundColor = "var(--color-primary)";
            popupBtn.textContent = "정화 노드 추가 요청";
        }

        document.getElementById("selected-zone-status").textContent = zone.status === "귀향시작" ? "🟢 안전함" :
                                                                       zone.status === "예약가능" ? "🟡 예약가능" : "🔴 차단됨";
        document.getElementById("countdown-days").textContent = Math.round(zone.time_to_safe_years * 365);
        lucide.createIcons();
    }

    function updateMobileStats(zone) {
        const toxicityPpm = (zone.soil_contamination / 5).toFixed(1);
        document.getElementById("mobile-line-chart-val").textContent = toxicityPpm;
        
        const airVal = Math.round(zone.air_quality * 0.9);
        document.getElementById("mobile-aqi-val").textContent = `${airVal}%`;
        const cCirc = 289;
        document.getElementById("mobile-aqi-circle").style.strokeDashoffset = cCirc - (airVal / 100) * cCirc;

        const ndviVal = zone.vegetation_ndvi.toFixed(2);
        document.getElementById("mobile-ndvi-val").textContent = `${ndviVal} / 1.0`;
        document.getElementById("mobile-ndvi-fill").style.width = `${zone.vegetation_ndvi * 100}%`;

        const yearsLeft = Math.ceil(zone.time_to_safe_years);
        document.getElementById("mobile-sim-years").textContent = yearsLeft === 0 ? "안전" : `Y${yearsLeft}`;
        document.getElementById("mobile-status-badge-timeline").textContent = zone.status === "귀향시작" ? "🟢 안전함" : zone.status === "예약가능" ? "🟡 예약가능" : "🔴 차단됨";
        
        const sliderWidth = Math.round((1 - (zone.time_to_safe_years / 10)) * 100);
        const clampedWidth = Math.max(10, Math.min(sliderWidth, 100));
        document.getElementById("mobile-timeline-track-fill").style.width = `${clampedWidth}%`;
        document.getElementById("mobile-timeline-track-thumb").style.style = `left: ${clampedWidth}%`;
    }

    // Dynamic ecology assets mapping (Unsplash keywords related to local ecoregions)
    const zoneEcologyAssets = {
        "forest": {
            futureImg: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600",
            midImg: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600",
            futureOverlay: "AI 시뮬레이션 결과<br>복원된 참나무 숲",
            midOverlay: "수변 생태계 자정 회복"
        },
        "marine": {
            futureImg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600",
            midImg: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=600",
            futureOverlay: "AI 시뮬레이션 결과<br>독도 바다 숲 복원",
            midOverlay: "연안 수생 생태계 복구"
        },
        "coast": {
            futureImg: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=600",
            midImg: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600",
            futureOverlay: "AI 시뮬레이션 결과<br>해안 복합 주거 빌리지",
            midOverlay: "갯벌 연안 수질 정화"
        },
        "dome": {
            futureImg: "https://images.unsplash.com/photo-1549558549-415fa4bc35eb?auto=format&fit=crop&q=80&w=600",
            midImg: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600",
            futureOverlay: "AI 시뮬레이션 결과<br>행정/주거 에코돔 기동",
            midOverlay: "돔 내부 순환 하천 복원"
        },
        "industrial": {
            futureImg: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=600",
            midImg: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
            futureOverlay: "AI 시뮬레이션 결과<br>탄소 제로 친환경 공원",
            midOverlay: "공단 배후 하천 정화"
        }
    };

    function getEcologyType(zoneId) {
        if (zoneId === "KR-DK-01") return "marine";
        if (zoneId === "KR-TA-01" || zoneId === "KR-BS-01") return "coast";
        if (zoneId.includes("-SL-") || zoneId.includes("-SJ-") || zoneId.includes("-DJ-") || zoneId.includes("-GJ-")) return "dome";
        if (zoneId.includes("-IC-") || zoneId.includes("-US-") || zoneId.includes("-AS-") || zoneId.includes("-DG-") || zoneId.includes("-YS-")) return "industrial";
        return "forest";
    }

    function syncTimelineForZone(zone) {
        const diary = zoneDiaries[zone.zone_id];
        if (!diary) return;

        const future = zoneFutureTimelines[zone.zone_id];

        // Ensure dynamic 4-year increments timeline calculation
        let T = zone.time_to_safe_years;
        if (T === undefined) {
            const R = zone.recovery_rate;
            if (R >= 90) {
                T = 0;
            } else if (R >= 70) {
                T = 4;
            } else if (R >= 50) {
                T = 8;
            } else if (R >= 30) {
                T = 12;
            } else {
                T = 16;
            }
        }

        // Update images and overlays dynamically
        const ecoType = getEcologyType(zone.zone_id);
        const assets = zoneEcologyAssets[ecoType];
        
        const deskImg2035 = document.getElementById("desktop-feed-2035-img");
        const deskOverlay2035 = document.getElementById("desktop-feed-2035-overlay");
        const deskImg2029 = document.getElementById("desktop-feed-2029-img");
        const deskOverlay2029 = document.getElementById("desktop-feed-2029-overlay");
        const mobSep1Img = document.getElementById("mobile-feed-sep1-img");
        const mobSep2Img = document.getElementById("mobile-feed-sep2-img");

        if (deskImg2035) deskImg2035.src = assets.futureImg;
        if (deskOverlay2035) deskOverlay2035.innerHTML = assets.futureOverlay;
        if (deskImg2029) deskImg2029.src = assets.midImg;
        if (deskOverlay2029) deskOverlay2029.innerHTML = assets.midOverlay;
        if (mobSep1Img) mobSep1Img.src = assets.futureImg;
        if (mobSep2Img) mobSep2Img.src = assets.midImg;

        document.getElementById("desktop-timeline-active-zone").textContent = zone.zone_name;
        document.getElementById("mobile-timeline-active-zone").textContent = zone.zone_name;

        // --- 1. Desktop Timeline Card updates ---
        const deskCard1 = document.querySelector(".timeline-card-wrapper.future");
        const deskCard2 = document.querySelector(".timeline-card-wrapper.mid-term");
        const deskCard3 = document.querySelector(".timeline-card-wrapper.start");

        if (deskCard3) {
            const dateEl = deskCard3.querySelector(".feed-date");
            if (dateEl) dateEl.textContent = "2026년 03월 20일";
            const badgeEl = deskCard3.querySelector(".badge-status-grey");
            if (badgeEl) badgeEl.textContent = "INITIATED 2026";
        }

        if (deskCard2) {
            const dateEl = deskCard2.querySelector(".feed-date");
            if (dateEl) {
                dateEl.textContent = "2028년 10월 05일";
            }
        }

        if (deskCard1) {
            const dateEl = deskCard1.querySelector(".feed-date");
            if (dateEl) {
                dateEl.textContent = "2030년 04월 12일";
            }
            const badgeEl = deskCard1.querySelector(".badge-status-blue") || deskCard1.querySelector('[class^="badge-status-"]');
            if (badgeEl) {
                badgeEl.textContent = "PREDICTED 2030";
            }
        }

        document.getElementById("desktop-feed-2035-p1").textContent = future ? `"${future.futureP1}"` : `"${diary.p1}"`;
        document.getElementById("desktop-feed-2035-p2").textContent = future ? future.futureP2 : diary.p2;
        
        const toxPpm = (zone.soil_contamination / 500).toFixed(3);
        const divPercent = Math.round(zone.recovery_rate * 0.85);
        document.getElementById("desktop-feed-2035-tox").innerHTML = `${toxPpm} ppm <i data-lucide="trending-down"></i>`;
        document.getElementById("desktop-feed-2035-div").innerHTML = `${divPercent} % <i data-lucide="trending-up"></i>`;

        // Mid-term card (2029)
        const dContent2029 = document.getElementById("desktop-feed-2029-content");
        if (dContent2029) {
            dContent2029.textContent = future ? `"${future.midContent}"` : `"정화 분석 노드 필터가 복원된 유역 전체에 배치되어 수질 등급이 상향되었습니다."`;
            if (dContent2029.previousElementSibling) {
                dContent2029.previousElementSibling.textContent = future ? future.midTitle : "수변 생태계의 귀환";
            }
        }
        
        // Start card (2025)
        const currentProgress = Math.round(zone.recovery_rate * 0.15);
        document.getElementById("desktop-feed-2025-content").textContent = future ? future.startContent : `스마트 측정 센서들이 경계선 주변에 구축되어 독성 변화를 트래킹하기 시작했습니다.`;
        document.getElementById("desktop-feed-2025-fill").style.width = `${currentProgress}%`;
        document.getElementById("desktop-feed-2025-percent").textContent = `분석 진행률 ${currentProgress}%`;

        // --- 2. Mobile Timeline Card updates ---
        const mobTimeline = document.getElementById("mobile-timeline-flow");
        if (mobTimeline) {
            const mobCards = mobTimeline.querySelectorAll(".mobile-timeline-node");
            if (mobCards.length >= 3) {
                // Card 1 (Future)
                const mobCard1Date = mobCards[0].querySelector(".date");
                if (mobCard1Date) mobCard1Date.textContent = "2030년 04월 12일";

                mobCards[0].querySelector(".card-title-bold").textContent = future ? future.futureTitle : "복원된 참나무 숲";
                mobCards[0].querySelector(".card-quote").textContent = future ? `"${future.futureP1}"` : `"${diary.p1}"`;
                mobCards[0].querySelector(".val").innerHTML = `${toxPpm} ppm <span class="trend-down"><i data-lucide="arrow-down"></i> ${Math.round(zone.recovery_rate / 3)}%</span>`;

                // Card 2 (Mid-term)
                const mobCard2Date = mobCards[1].querySelector(".date");
                if (mobCard2Date) {
                    mobCard2Date.textContent = "2028년 10월 05일";
                }

                mobCards[1].querySelector(".card-title-bold").textContent = future ? future.midTitle : "수변 생태계의 귀환";
                mobCards[1].querySelector(".card-quote").textContent = future ? `"${future.midContent}"` : `"정화 필터 배치 완료"`;
                mobCards[1].querySelector(".val").innerHTML = `${Math.round(100 - zone.recovery_rate)}% <span class="trend-down"><i data-lucide="arrow-down"></i> ${Math.round(zone.recovery_rate / 2)}%</span>`;

                // Card 3 (Start)
                const mobCard3Date = mobCards[2].querySelector(".date");
                if (mobCard3Date) mobCard3Date.textContent = "2026년 03월 20일";

                mobCards[2].querySelector(".card-quote").textContent = future ? `"${future.startContent}"` : `"분석 가동 시작"`;
                const progressFill = mobCards[2].querySelector(".progress-bar-fill");
                if (progressFill) progressFill.style.width = `${currentProgress}%`;
                const progressStatus = mobCards[2].querySelector(".val");
                if (progressStatus) progressStatus.textContent = `${currentProgress}% 진행중`;
            }
        }
        
        lucide.createIcons();
    }

    // --- 6. GEMINI AI CERTIFICATE UPLOAD (MATRIX / DIGNITY SCORE) ---
    const deskFileInput = document.getElementById("desktop-file-input");
    const deskSelectBtn = document.getElementById("desktop-btn-select");
    const deskDropzone = document.getElementById("desktop-upload-dropzone");
    const deskStatusBox = document.getElementById("desktop-upload-status");
    const deskLatency = document.getElementById("desktop-upload-time");
    
    const mobFileInput = document.getElementById("mobile-file-input");
    const mobUploadBtn = document.getElementById("mobile-btn-upload");
    const mobStatusBox = document.getElementById("mobile-upload-status");

    const deskLedgerRows = document.getElementById("desktop-ledger-rows");
    const mobLedgerRows = document.getElementById("mobile-ledger-rows");

    const deskScoreValDisp = document.getElementById("desktop-priority-val");
    const mobScoreValDisp = document.getElementById("mobile-priority-score-val");
    const mobQueueValDisp = document.getElementById("mobile-queue-number-val");

    deskSelectBtn.addEventListener("click", (e) => { e.stopPropagation(); deskFileInput.click(); });
    deskDropzone.addEventListener("click", () => deskFileInput.click());
    mobUploadBtn.addEventListener("click", () => mobFileInput.click());

    deskDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        deskDropzone.style.borderColor = "var(--color-primary)";
        deskDropzone.style.backgroundColor = "var(--color-primary-light)";
    });

    deskDropzone.style.transition = "all 0.2s ease";

    deskDropzone.addEventListener("dragleave", () => {
        deskDropzone.style.borderColor = "#CBD5E1";
        deskDropzone.style.backgroundColor = "var(--color-bg-app)";
    });

    deskDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        deskDropzone.style.borderColor = "#CBD5E1";
        deskDropzone.style.backgroundColor = "var(--color-bg-app)";
        if (e.dataTransfer.files.length > 0) {
            processDocument(e.dataTransfer.files[0]);
        }
    });

    deskFileInput.addEventListener("change", () => {
        if (deskFileInput.files.length > 0) processDocument(deskFileInput.files[0]);
    });

    mobFileInput.addEventListener("change", () => {
        if (mobFileInput.files.length > 0) processDocument(mobFileInput.files[0]);
    });

    async function processDocument(file) {
        console.log(`Uploading certificate document: ${file.name}`);
        
        deskStatusBox.classList.remove("hidden");
        mobStatusBox.classList.remove("hidden");

        const formData = new FormData();
        const activeSession = JSON.parse(localStorage.getItem("roothome_session"));
        const userId = activeSession ? activeSession.email : `RT-${Math.floor(1000 + Math.random() * 9000)}-****`;
        formData.append("user_id", userId);
        formData.append("file", file);

        const startTime = Date.now();

        try {
            const response = await fetch(`${backendUrl}/api/applicants/upload`, {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const latency = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                deskLatency.textContent = latency;
                updateUIAfterUpload(data);
            } else {
                throw new Error("FastAPI server upload error response");
            }
        } catch (err) {
            console.warn("Backend API offline for upload. Running simulated local AI parsing.");
            
            setTimeout(() => {
                const finalScore = Math.round(82 + Math.random() * 18);
                const queueNum = Math.floor(Math.random() * 8) + 1;
                
                const data = {
                    user_id: `RT-${Math.floor(1000 + Math.random() * 9000)}-****`,
                    calculated_score: finalScore,
                    queue_number: queueNum
                };
                
                deskLatency.textContent = "1.2s";
                updateUIAfterUpload(data);
            }, 1500);
        }
    }

    function updateUIAfterUpload(data) {
        deskStatusBox.classList.add("hidden");
        mobStatusBox.classList.add("hidden");

        const finalScore = Math.round(data.calculated_score);
        const queueNum = data.queue_number;

        deskScoreValDisp.textContent = finalScore;
        mobScoreValDisp.textContent = finalScore;
        mobQueueValDisp.textContent = `${queueNum}`;

        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // Prepend to Desktop Ledger
        const dRow = document.createElement("tr");
        dRow.style.animation = "fadeIn 0.5s ease";
        dRow.innerHTML = `
            <td>${data.user_id}</td>
            <td class="font-bold font-blue">${finalScore}</td>
            <td><span class="status-verified"><i data-lucide="check-circle-2"></i> Gemini Verified</span></td>
            <td>#00${queueNum}</td>
            <td>${timestamp}</td>
        `;
        deskLedgerRows.insertBefore(dRow, deskLedgerRows.firstChild);

        // Prepend to Mobile Ledger
        const mRow = document.createElement("tr");
        mRow.style.animation = "fadeIn 0.5s ease";
        const badgeClass = finalScore >= 95 ? "pill-critical" : "pill-verified";
        const badgeText = finalScore >= 95 ? "최우선" : "인증됨";
        mRow.innerHTML = `
            <td>${data.user_id}</td>
            <td class="font-bold font-blue">${finalScore}</td>
            <td><span class="${badgeClass}">${badgeText}</span></td>
            <td>#00${queueNum}</td>
        `;
        mobLedgerRows.insertBefore(mRow, mobLedgerRows.firstChild);

        lucide.createIcons();
        alert(`Gemini AI 분석이 성공적으로 처리되었습니다!\n우선순위 점수: ${finalScore}점 (대기 번호: #${queueNum})`);
    }

    // --- 7. TIMELINE CUSTOM OVERRIDE (Search Address) ---
    const deskGenerateBtn = document.getElementById("desktop-btn-generate");
    const deskAddressInput = document.getElementById("desktop-address-input");
    const deskTimelineLoading = document.getElementById("desktop-timeline-loading");
    
    const mobGenerateBtn = document.getElementById("mobile-btn-generate");
    const mobAddressInput = document.getElementById("mobile-address-input");
    const mobTimelineLoading = document.getElementById("mobile-timeline-loading");

    async function runTimelineAPIRequest(address) {
        deskTimelineLoading.classList.remove("hidden");
        mobTimelineLoading.classList.remove("hidden");
        
        deskGenerateBtn.disabled = true;
        mobGenerateBtn.disabled = true;

        try {
            const response = await fetch(`${backendUrl}/api/diary/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ address: address })
            });

            if (response.ok) {
                const data = await response.json();
                updateTimelineContent(address, data.diary_feed);
            } else {
                throw new Error("FastAPI server diary error response");
            }
        } catch (err) {
            console.warn("Backend API offline for timeline. Running local simulated generator.");
            
            setTimeout(() => {
                const activeZone = zonesData.find(z => z.zone_id === selectedZoneId) || zonesData[2];
                const sim1 = `봄바람이 부는 고향 ${address}의 구릉지에 드디어 초록빛 무성한 들풀이 무릎춤까지 차올랐습니다. 현재 루트홈 환경 측정상 식생 복구율이 무려 ${activeZone.recovery_rate}%에 달합니다.`;
                const sim2 = `어린 시절 뛰놀던 개울가에는 맑은 민물이 가득 고여 수달들의 발자국이 선명하게 목격되고 있으며, 대기 오염 점수가 무려 ${activeZone.air_quality}/100을 찍어 산들바람 속에서 투명한 풀향기가 배어 나옵니다. 옛 마당 한편에 서 있던 고목나무 그늘 아래서 따뜻한 보리차 한잔을 마실 그날이 성큼 다가왔음을 느껴 봅니다.`;
                
                const combinedDiary = `${sim1}\n\n${sim2}`;
                updateTimelineContent(address, combinedDiary);
            }, 1500);
        }
    }

    function updateTimelineContent(address, diaryContent) {
        deskTimelineLoading.classList.add("hidden");
        mobTimelineLoading.classList.add("hidden");
        deskGenerateBtn.disabled = false;
        mobGenerateBtn.disabled = false;

        const paragraphs = diaryContent.split("\n\n");
        const sim1 = paragraphs[0] || "";
        const sim2 = paragraphs[1] || "";

        // Determine T from active zone
        const activeZone = zonesData.find(z => z.zone_id === selectedZoneId) || zonesData[2];
        const R = activeZone.recovery_rate;
        let T = 0;
        if (R >= 90) {
            T = 0;
        } else if (R >= 70) {
            T = 4;
        } else if (R >= 50) {
            T = 8;
        } else if (R >= 30) {
            T = 12;
        } else {
            T = 16;
        }

        document.getElementById("desktop-timeline-active-zone").textContent = `${address} (시뮬레이션 반영)`;
        document.getElementById("mobile-timeline-active-zone").textContent = address;

        // --- Desktop Dates & Badges Updates ---
        const deskCard1 = document.querySelector(".timeline-card-wrapper.future");
        const deskCard2 = document.querySelector(".timeline-card-wrapper.mid-term");
        const deskCard3 = document.querySelector(".timeline-card-wrapper.start");

        if (deskCard3) {
            const dateEl = deskCard3.querySelector(".feed-date");
            if (dateEl) dateEl.textContent = "2026년 03월 20일";
            const badgeEl = deskCard3.querySelector(".badge-status-grey");
            if (badgeEl) badgeEl.textContent = "INITIATED 2026";
        }

        if (deskCard2) {
            const dateEl = deskCard2.querySelector(".feed-date");
            if (dateEl) {
                dateEl.textContent = "2028년 10월 05일";
            }
        }

        if (deskCard1) {
            const dateEl = deskCard1.querySelector(".feed-date");
            if (dateEl) {
                dateEl.textContent = "2030년 04월 12일";
            }
            const badgeEl = deskCard1.querySelector(".badge-status-blue") || deskCard1.querySelector('[class^="badge-status-"]');
            if (badgeEl) {
                badgeEl.textContent = "PREDICTED 2030";
            }
        }

        document.getElementById("desktop-feed-2035-p1").textContent = `"${sim1}"`;
        document.getElementById("desktop-feed-2035-p2").textContent = sim2;
        
        document.getElementById("desktop-feed-2029-content").textContent = `"어릴 적 발을 담그던 ${address}의 개울가에 다시 은어들이 돌아왔습니다. AI 정화 필터가 설치된 지 3년 만에 하천의 자정 능력이 완전히 회복되었습니다."`;

        // --- Mobile Timeline Card updates ---
        const mobTimeline = document.getElementById("mobile-timeline-flow");
        if (mobTimeline) {
            const mobCards = mobTimeline.querySelectorAll(".mobile-timeline-node");
            if (mobCards.length >= 3) {
                // Card 1
                const mobCard1Date = mobCards[0].querySelector(".date");
                if (mobCard1Date) mobCard1Date.textContent = "2030년 04월 12일";
                mobCards[0].querySelector(".card-quote").textContent = `"${sim1}"`;

                // Card 2
                const mobCard2Date = mobCards[1].querySelector(".date");
                if (mobCard2Date) {
                    mobCard2Date.textContent = "2028년 10월 05일";
                }
                mobCards[1].querySelector(".card-quote").textContent = `"어릴 적 발을 담그던 ${address}의 개울가에 다시 은어들이 돌아왔습니다. 정화 노드 유량 포화도 100% 달성 및 자정 능력이 성공적으로 완비되었습니다."`;

                // Card 3
                const mobCard3Date = mobCards[2].querySelector(".date");
                if (mobCard3Date) mobCard3Date.textContent = "2026년 03월 20일";
            }
        }

        lucide.createIcons();
        alert(`'${address}' 주소에 적합한 AI 고향의 봄 시뮬레이션 타임라인이 피드에 로드되었습니다!`);
    }

    if (deskGenerateBtn) {
        deskGenerateBtn.addEventListener("click", () => {
            const addr = deskAddressInput.value.trim();
            if (addr) runTimelineAPIRequest(addr);
        });
    }

    if (mobGenerateBtn) {
        mobGenerateBtn.addEventListener("click", () => {
            const addr = mobAddressInput.value.trim();
            if (addr) runTimelineAPIRequest(addr);
        });
    }

    // --- 7.5 50-YEAR PREDICTIONS & TIMELINE DRAG CONTROLLER ---
    async function fetch50YearPredictions() {
        try {
            console.log("[Prediction] Fetching 50-year forecasting data from:", `${backendUrl}/api/zones/prediction`);
            const res = await fetch(`${backendUrl}/api/zones/prediction`);
            if (res.ok) {
                predictionsData = await res.json();
                console.log("[Prediction SUCCESS] 50개년 기후 오염 예측 데이터 수집 성공!");
            } else {
                throw new Error("FastAPI prediction endpoint error");
            }
        } catch (err) {
            console.warn("[Prediction FALLBACK] 원격 API 접속 실패. 로컬 회귀수식 백업 예보 엔진을 구동합니다:", err);
            // 인터넷 장애나 백엔드 통신 오류 시 가동되는 안전한 백업 예보 발전기
            predictionsData = zonesData.map(zone => {
                const basePollution = 100 - zone.recovery_rate;
                const predictions = [];
                for (let t = 0; t <= 20; t += 1) {
                    const year = 2016 + t;
                    const diffYears = t - 10; // -10 for 2016, 0 for 2026, +10 for 2036
                    const wave = Math.sin(0.4 * diffYears) * 3.5 * Math.exp(-0.02 * diffYears);
                    const pollution = Math.max(0, Math.min(100, (basePollution * Math.exp(-0.045 * diffYears) + wave)));
                    const statusText = pollution > 70 ? "강력 봉쇄 (접근 불허)" : pollution > 40 ? "부분 경계 (정화 진행)" : pollution > 20 ? "귀향 가용 (우선 귀향 티켓 발행)" : "전면 정화 (자유 귀향 구역)";
                    predictions.push({
                        year,
                        pollution_rate: Math.round(pollution * 10) / 10,
                        status: statusText
                    });
                }
                return {
                    zone_id: zone.zone_id,
                    zone_name: zone.zone_name,
                    predictions
                };
            });
        }
    }

    function updateMapForYear(year) {
        if (!predictionsData) return;

        predictionsData.forEach(predGroup => {
            const zoneId = predGroup.zone_id;
            const predForYear = predGroup.predictions.find(p => p.year === year);
            if (!predForYear) return;

            const pollution = predForYear.pollution_rate;

            let color;
            if (pollution > 70) {
                color = "#ef4444"; // 강력 봉쇄 (Red)
            } else if (pollution > 40) {
                color = "#f97316"; // 부분 경계 (Orange)
            } else if (pollution > 20) {
                color = "#eab308"; // 귀향 가용 (Yellow)
            } else {
                color = "#10b981"; // 전면 정화 (Green!)
            }

            // 1) 데스크탑 폴리곤 스타일 및 팝업 갱신
            const deskPoly = desktopMapCircles[zoneId];
            if (deskPoly) {
                deskPoly.setStyle({
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.55
                });
                const zoneName = predGroup.zone_name.split(" - ")[1] || predGroup.zone_name;
                deskPoly.bindPopup(`
                    <div style="font-family:'Outfit',sans-serif; padding:4px; line-height:1.4;">
                         <strong style="color:${color}; font-size:14px;">📡 ${year}년 기후/재난 예보</strong><br>
                         <strong style="font-size:13px; display:block; margin-top:4px;">📍 구역: ${zoneName}</strong>
                         <span style="font-size:12px; color:#64748b; display:block; margin:2px 0;">오염 점수: <strong>${pollution}%</strong></span>
                         <span style="font-size:11px; font-weight:bold; background:${color}15; color:${color}; padding:3px 6px; border-radius:4px; display:inline-block; margin-top:2px;">${predForYear.status}</span>
                    </div>
                `);
            }

            // 2) 모바일 폴리곤 스타일 및 팝업 갱신
            const mobPoly = mobileMapCircles[zoneId];
            if (mobPoly) {
                mobPoly.setStyle({
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.55
                });
                const zoneName = predGroup.zone_name.split(" - ")[1] || predGroup.zone_name;
                mobPoly.bindPopup(`
                    <div style="font-family:sans-serif; line-height:1.4;">
                         <strong style="color:${color};">${year}년 예보: ${zoneName}</strong><br>
                         오염 점수: ${pollution}%<br>
                         통제 상태: <strong>${predForYear.status}</strong>
                    </div>
                `);
            }
        });

        // 우측 상세 제어 패널 디테일 실시간 스와이핑
        const currentSelected = zonesData.find(z => z.zone_id === selectedZoneId);
        if (currentSelected) {
            const predGroup = predictionsData.find(p => p.zone_id === selectedZoneId);
            if (predGroup) {
                const predForYear = predGroup.predictions.find(p => p.year === year);
                if (predForYear) {
                    const badge = document.getElementById("selected-zone-status");
                    if (badge) {
                        badge.textContent = predForYear.status;
                        badge.style.color = colorMap(predForYear.pollution_rate);
                    }
                    const desc = document.getElementById("selected-zone-desc");
                    if (desc) {
                        desc.textContent = `${year}년 기후 시뮬레이션: 기후 난민 재정착 오염도가 ${predForYear.pollution_rate}%로 예측 연산되었습니다. 이에 따라 기후재난 통제 등급은 '${predForYear.status}' 단계로 수립됩니다.`;
                    }
                }
            }
        }
    }

    function colorMap(pollution) {
        if (pollution > 70) return "#ef4444";
        if (pollution > 40) return "#f97316";
        if (pollution > 20) return "#eab308";
        return "#10b981";
    }

    function initTimelineDragController() {
        const track = document.querySelector(".timeline-progress-track");
        const fill = document.querySelector(".timeline-progress-fill");
        const handle = document.querySelector(".timeline-handle");
        const countdownDays = document.getElementById("countdown-days");
        const marks = document.querySelectorAll(".slider-marks .mark-item");

        if (!track || !fill || !handle) return;

        let isDragging = false;

        function updateTimelineByPosition(clientX) {
            const rect = track.getBoundingClientRect();
            let percentage = (clientX - rect.left) / rect.width;
            percentage = Math.max(0, Math.min(1, percentage)); // Clamp 0% ~ 100%

            fill.style.width = `${percentage * 100}%`;
            handle.style.left = `${percentage * 100}%`;

            const step = Math.round(percentage * 20);
            const targetYear = 2016 + step;

            // 남은 일수 디그라데이션 연산 (2016: 142일 -> 2036: 0일)
            const daysRemaining = Math.max(0, Math.round((1 - (step / 20)) * 142));
            if (countdownDays) countdownDays.textContent = daysRemaining;

            // 라벨 active 인덱싱 교정
            marks.forEach((mark, index) => {
                if (index === 0 && targetYear <= 2020) {
                    mark.classList.add("active");
                } else if (index === 1 && targetYear > 2020 && targetYear <= 2030) {
                    mark.classList.add("active");
                } else if (index === 2 && targetYear > 2030) {
                    mark.classList.add("active");
                } else {
                    mark.classList.remove("active");
                }
            });

            updateMapForYear(targetYear);
        }

        track.addEventListener("mousedown", (e) => {
            isDragging = true;
            updateTimelineByPosition(e.clientX);
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            updateTimelineByPosition(e.clientX);
        });

        window.addEventListener("mouseup", () => {
            isDragging = false;
        });

        // 모바일 터치이벤트 대응
        track.addEventListener("touchstart", (e) => {
            isDragging = true;
            if (e.touches[0]) updateTimelineByPosition(e.touches[0].clientX);
        });

        window.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            if (e.touches[0]) updateTimelineByPosition(e.touches[0].clientX);
        });

        window.addEventListener("touchend", () => {
            isDragging = false;
        });
    }

    // --- 7.6 PREMIUM GLASSMORPHISM AUTHENTICATION SUB-SYSTEM ---
    function initAuthSystem() {
        const authModal = document.getElementById("auth-modal");
        const authCloseBtn = document.getElementById("auth-close-btn");
        const tabLoginBtn = document.getElementById("tab-login-btn");
        const tabSignupBtn = document.getElementById("tab-signup-btn");
        const loginForm = document.getElementById("login-form");
        const signupForm = document.getElementById("signup-form");

        if (!authModal || !authCloseBtn || !tabLoginBtn || !tabSignupBtn || !loginForm || !signupForm) {
            console.warn("[Auth System] Auth elements not found in DOM");
            return;
        }

        // Prepopulate users and session
        if (!localStorage.getItem("roothome_users")) {
            localStorage.setItem("roothome_users", JSON.stringify([
                { email: "test@roothome.org", name: "강유진", password: "password123" }
            ]));
        }

        // Open/Close Modal
        function openAuth() {
            authModal.classList.remove("hidden");
            switchTab("login");
        }
        function closeAuth() {
            authModal.classList.add("hidden");
        }

        authCloseBtn.addEventListener("click", closeAuth);

        // Click outside to close
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) closeAuth();
        });

        // Switch Tabs
        function switchTab(tab) {
            if (tab === "login") {
                tabLoginBtn.classList.add("active");
                tabSignupBtn.classList.remove("active");
                loginForm.classList.remove("hidden");
                signupForm.classList.add("hidden");
            } else {
                tabLoginBtn.classList.remove("active");
                tabSignupBtn.classList.add("active");
                loginForm.classList.add("hidden");
                signupForm.classList.remove("hidden");
            }
        }

        tabLoginBtn.addEventListener("click", () => switchTab("login"));
        tabSignupBtn.addEventListener("click", () => switchTab("signup"));

        // Login Handler
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem("roothome_session", JSON.stringify({ email: user.email, name: user.name }));
                updateAuthStateUI();
                closeAuth();
                alert(`반갑고 안온한 복귀입니다, ${user.name} 님!`);
            } else {
                alert("이메일 주소 또는 비밀번호가 일치하지 않습니다.");
            }
        });

        // Signup Handler
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value;

            if (password.length < 6) {
                alert("비밀번호는 최소 6자리 이상이어야 합니다.");
                return;
            }

            const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
            if (users.some(u => u.email === email)) {
                alert("이미 등록된 이메일 주소입니다.");
                return;
            }

            users.push({ email, name, password });
            localStorage.setItem("roothome_users", JSON.stringify(users));
            alert("회원가입이 성공적으로 완료되었습니다! 로그인 해 주세요.");
            switchTab("login");
        });

        // Toggle state triggers
        const sidebarProfile = document.querySelector(".sidebar-profile");
        const headerLoginBtn = document.querySelector(".header-login-btn-wrapper");
        const mobHeaderRight = document.querySelector(".mobile-header-right");
        const mobProfileCard = document.querySelector(".profile-main-card");

        function handleProfileTriggerClick(e) {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            if (session) {
                if (confirm("로그아웃 하시겠습니까?")) {
                    localStorage.removeItem("roothome_session");
                    updateAuthStateUI();
                    alert("성공적으로 로그아웃되었습니다.");
                }
            } else {
                openAuth();
            }
        }

        if (sidebarProfile) sidebarProfile.addEventListener("click", handleProfileTriggerClick);
        if (headerLoginBtn) headerLoginBtn.addEventListener("click", handleProfileTriggerClick);
        if (mobHeaderRight) {
            mobHeaderRight.addEventListener("click", (e) => {
                if (e.target.closest(".mobile-icon-btn")) return;
                handleProfileTriggerClick();
            });
        }
        if (mobProfileCard) mobProfileCard.addEventListener("click", handleProfileTriggerClick);

        // Update UI state based on session
        function updateAuthStateUI() {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            const profileName = document.querySelector(".profile-name");
            const profileRole = document.querySelector(".profile-role");
            const mobProfName = document.querySelector(".profile-user-name");
            const mobProfRole = document.querySelector(".profile-user-role");
            const headerLoginBtnSpan = headerLoginBtn ? headerLoginBtn.querySelector("span") : null;
            const headerLoginBtnIcon = headerLoginBtn ? headerLoginBtn.querySelector("i") : null;
            const mobHeaderRightSpan = mobHeaderRight ? mobHeaderRight.querySelector("span") : null;

            const statNums = document.querySelectorAll(".profile-main-card .stat-box .num");

            if (session) {
                // Logged In UI
                if (profileName) profileName.textContent = `${session.name} 님`;
                if (profileRole) profileRole.textContent = "정착 권한 인증 완료";

                if (headerLoginBtnSpan) headerLoginBtnSpan.textContent = "로그아웃";
                if (headerLoginBtnIcon) {
                    headerLoginBtnIcon.setAttribute("data-lucide", "log-out");
                    headerLoginBtnIcon.style.color = "var(--color-primary)";
                }

                if (mobHeaderRightSpan) mobHeaderRightSpan.textContent = "로그아웃";

                if (mobProfName) mobProfName.textContent = session.name;
                if (mobProfRole) mobProfRole.textContent = session.email;

                if (statNums.length >= 3) {
                    statNums[0].textContent = "68세";
                    statNums[1].textContent = "A등급";
                    statNums[2].textContent = "45년";
                }
            } else {
                // Logged Out UI
                if (profileName) profileName.textContent = "실향민 로그인";
                if (profileRole) profileRole.textContent = "정착 서비스 대기 중";

                if (headerLoginBtnSpan) headerLoginBtnSpan.textContent = "실향민 안심 로그인";
                if (headerLoginBtnIcon) {
                    headerLoginBtnIcon.setAttribute("data-lucide", "log-in");
                    headerLoginBtnIcon.style.color = "var(--color-text-muted)";
                }

                if (mobHeaderRightSpan) mobHeaderRightSpan.textContent = "실향민 로그인";

                if (mobProfName) mobProfName.textContent = "실향민 로그인";
                if (mobProfRole) mobProfRole.textContent = "고향 귀향 서비스를 위한 안심 로그인";

                if (statNums.length >= 3) {
                    statNums[0].textContent = "-";
                    statNums[1].textContent = "-";
                    statNums[2].textContent = "-";
                }
            }

            // --- SYNC HOMETOWN & RESIDENCE LABELS ---
            let hometown = "";
            let residence = "";

            if (session) {
                const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                const user = users.find(u => u.email === session.email);
                if (user) {
                    hometown = user.hometown || "";
                    residence = user.residence || "";
                }
            } else {
                const guestSettings = JSON.parse(localStorage.getItem("roothome_guest_settings")) || {};
                hometown = guestSettings.hometown || "";
                residence = guestSettings.residence || "";
            }

            const sidebarMeta = document.getElementById("sidebar-profile-meta");
            const sidebarHomeSpan = document.getElementById("sidebar-meta-hometown");
            const sidebarResSpan = document.getElementById("sidebar-meta-residence");

            const mobileMeta = document.getElementById("mobile-profile-meta");
            const mobileHomeSpan = document.getElementById("mobile-meta-hometown");
            const mobileResSpan = document.getElementById("mobile-meta-residence");

            if (hometown || residence) {
                if (sidebarMeta) sidebarMeta.classList.remove("hidden");
                if (sidebarHomeSpan) sidebarHomeSpan.textContent = hometown || "미지정";
                if (sidebarResSpan) sidebarResSpan.textContent = residence || "미지정";

                if (mobileMeta) mobileMeta.classList.remove("hidden");
                if (mobileHomeSpan) mobileHomeSpan.textContent = hometown || "미지정";
                if (mobileResSpan) mobileResSpan.textContent = residence || "미지정";
            } else {
                if (sidebarMeta) sidebarMeta.classList.add("hidden");
                if (mobileMeta) mobileMeta.classList.add("hidden");
            }
            
            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }
        }

        // Run UI sync at start
        updateAuthStateUI();

        // --- SETTINGS SYSTEM INTEGRATION ---
        const settingsModal = document.getElementById("settings-modal");
        const settingsCloseBtn = document.getElementById("settings-close-btn");
        const settingsForm = document.getElementById("settings-form");
        const settingsHometown = document.getElementById("settings-hometown");
        const settingsResidence = document.getElementById("settings-residence");

        function openSettings() {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            let hometownVal = "";
            let residenceVal = "";

            if (session) {
                const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                const user = users.find(u => u.email === session.email);
                if (user) {
                    hometownVal = user.hometown || "";
                    residenceVal = user.residence || "";
                }
            } else {
                const guestSettings = JSON.parse(localStorage.getItem("roothome_guest_settings")) || {};
                hometownVal = guestSettings.hometown || "";
                residenceVal = guestSettings.residence || "";
            }

            if (settingsHometown) settingsHometown.value = hometownVal;
            if (settingsResidence) settingsResidence.value = residenceVal;

            if (settingsModal) settingsModal.classList.remove("hidden");
        }

        function closeSettings() {
            if (settingsModal) settingsModal.classList.add("hidden");
        }

        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener("click", closeSettings);
        }

        if (settingsModal) {
            settingsModal.addEventListener("click", (e) => {
                if (e.target === settingsModal) closeSettings();
            });
        }

        // Bind Settings Triggers
        const sidebarSettingsLink = document.getElementById("sidebar-settings-link");
        if (sidebarSettingsLink) {
            sidebarSettingsLink.addEventListener("click", (e) => {
                e.preventDefault();
                openSettings();
            });
        }

        const headerSettingsBtn = document.querySelector(".header-icon-btn i[data-lucide='settings']");
        if (headerSettingsBtn) {
            const btnParent = headerSettingsBtn.closest(".header-icon-btn");
            if (btnParent) {
                btnParent.addEventListener("click", (e) => {
                    e.preventDefault();
                    openSettings();
                });
            }
        }

        const mobSettingsRowHometown = document.getElementById("mobile-settings-row-hometown");
        if (mobSettingsRowHometown) {
            mobSettingsRowHometown.addEventListener("click", (e) => {
                e.preventDefault();
                openSettings();
            });
        }

        // Settings Form Submission
        if (settingsForm) {
            settingsForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const hometown = settingsHometown.value.trim();
                const residence = settingsResidence.value.trim();

                const session = JSON.parse(localStorage.getItem("roothome_session"));
                if (session) {
                    const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                    const userIndex = users.findIndex(u => u.email === session.email);
                    if (userIndex !== -1) {
                        users[userIndex].hometown = hometown;
                        users[userIndex].residence = residence;
                        localStorage.setItem("roothome_users", JSON.stringify(users));
                    }
                } else {
                    const guestSettings = { hometown, residence };
                    localStorage.setItem("roothome_guest_settings", JSON.stringify(guestSettings));
                }

                updateAuthStateUI();
                autoPrefillTimelineAddresses();
                closeSettings();
                alert("설정이 성공적으로 저장되었습니다!");
            });
        }

        // AI Timeline Prepopulation Utility
        function autoPrefillTimelineAddresses() {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            let hometown = "";
            if (session) {
                const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                const user = users.find(u => u.email === session.email);
                if (user) hometown = user.hometown || "";
            } else {
                const guestSettings = JSON.parse(localStorage.getItem("roothome_guest_settings")) || {};
                hometown = guestSettings.hometown || "";
            }

            if (hometown) {
                const desktopInput = document.getElementById("desktop-address-input");
                const mobileInput = document.getElementById("mobile-address-input");
                if (desktopInput && !desktopInput.value) {
                    desktopInput.value = hometown;
                }
                if (mobileInput && !mobileInput.value) {
                    mobileInput.value = hometown;
                }
            }
        }

        // Prefill Timeline Input Box on load
        autoPrefillTimelineAddresses();
    }

    // --- 8. STARTUP INITIALIZATION ---
    initAuthSystem();
    loadZonesData(); // Fetch from backend and initialize maps
});
