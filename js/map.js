// js/map.js
// Leaflet Map & Safe Route Navigation Engine Module
import { mockZones } from './data.js?v=20260710-3';

// Dedicated Map State variables
export let desktopMap = null;
export let mobileMap = null;
export let desktopMapCircles = {};
export let mobileMapCircles = {};
export let cachedGeoData = null;
export let allMunicipalityLayers = [];

export let navPoints = [];
export let navMarkers = [];
export let navRouteLine = null;
export let navigatorModeActive = false;

// Helpers and utility flags
export function setNavigatorModeActive(val) {
    navigatorModeActive = val;
}

export function getStatusColor(status) {
    if (status === "귀향시작") return "var(--color-success)";
    if (status === "예약가능") return "var(--color-warning)";
    return "var(--color-danger)";
}

// 1) Leaflet maps initialization & binding
export function initLeafletMaps() {
    console.log("Initializing Leaflet Maps for South Korea (Modular)...");

    const centerPoint = [36.3000, 127.8000]; // Center of South Korea
    const tileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}';
    const attribution = '&copy; Google Maps';

    // 1) Desktop Map
    desktopMap = L.map('desktop-map', {
        center: centerPoint,
        zoom: 6,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false
    });
    L.tileLayer(tileUrl, { attribution: attribution }).addTo(desktopMap);
    desktopMap.on("click", (e) => { if (navigatorModeActive) handleNavigatorClick(e.latlng); });

    // 2) Mobile Map
    mobileMap = L.map('mobile-map', {
        center: centerPoint,
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false
    });
    L.tileLayer(tileUrl, { attribution: attribution }).addTo(mobileMap);

    // Deterministic pseudo-random generator
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

    // Helper to generate district outlines
    function generateDistrictPolygon(zoneId, lat, lng) {
        const rand = seedRandom(zoneId);
        const points = [];
        let radiusKm = 8.5;
        if (zoneId === "KR-DK-01") radiusKm = 3.5;
        else if (zoneId.startsWith("GL-")) radiusKm = 15.0;
        else if (zoneId === "KR-JN-01" || zoneId === "KR-JJ-01" || zoneId === "KR-UJ-01") radiusKm = 11.5;
        
        const latOffsetDegree = radiusKm / 110.574;
        const lngOffsetDegree = radiusKm / (111.320 * Math.cos(lat * Math.PI / 180));
        const numPoints = 6 + Math.floor(rand() * 4);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const factor = 0.75 + rand() * 0.55;
            const pLat = lat + Math.sin(angle) * latOffsetDegree * factor;
            const pLng = lng + Math.cos(angle) * lngOffsetDegree * factor;
            points.push([pLat, pLng]);
        }
        return points;
    }

    // Census GeoJSON loading & dynamic mapping
    loadMunicipalitiesGeoJSON(generateDistrictPolygon);

    window.addEventListener("resize", () => {
        if (desktopMap) desktopMap.invalidateSize();
        if (mobileMap) mobileMap.invalidateSize();
    });
}

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
    const targetZones = window.zonesData || mockZones;
    return targetZones.find(z => z.zone_id === zoneId) || null;
}

function getRegionFoodBias(code) {
    const prefix = code.slice(0, 2);
    if (prefix === "35" || prefix === "36") return 18; // 전북·전남
    
    // 경상북도·경상남도 안전 지대 대폭 확장 배점 (+18 가산 보정)
    if (prefix === "37" || prefix === "38") return 18; // 경북·경남
    
    // 경기도 안전 지대 대폭 추가 배점 (+20 가산 보정)
    if (prefix === "31") return 20; // 경기
    
    if (prefix === "32") return 10; // 강원
    if (["11", "21", "22", "23", "24", "25", "26", "29"].includes(prefix)) return -15; // 광역시/특별시
    return 0;
}

export function getMunicipalityData(code, name) {
    // timelinePercentage: 0=2016(오염), 0.5=현재, 1=2036(회복)
    const t = window.timelinePercentage != null ? window.timelinePercentage : 0.5;
    const timelineBonus = (t - 0.5) * 60; // -30 ~ +30

    const zone = findZoneByCode(code);
    if (zone) {
        const adjusted = Math.max(0, Math.min(100, zone.recovery_rate + timelineBonus));
        const status = adjusted >= 82 ? "귀향시작" : adjusted >= 55 ? "예약가능" : "봉쇄";
        return {
            name: zone.zone_name.split(" - ")[1] || zone.zone_name,
            recovery_rate: Math.round(adjusted * 10) / 10,
            status: status,
            zone: zone,
            isKeyZone: true
        };
    }
    // Seeded random for determinism
    let hash = 0;
    const keyStr = "muni-" + code;
    for (let i = 0; i < keyStr.length; i++) {
        hash = keyStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const randVal = Math.abs(Math.sin(hash) * 1000) % 1;
    const bias = getRegionFoodBias(code);
    const warmingDegrees = window.warmingDegrees || 0.0;
    const warmingPenalty = warmingDegrees * 12;
    const recovery = Math.max(5, Math.min(98, Math.round((30 + randVal * 68 + bias - warmingPenalty + timelineBonus) * 10) / 10));
    let status;
    if (recovery >= 82) status = "귀향시작";
    else if (recovery >= 55) status = "예약가능";
    else status = "봉쇄";
    return { name: name, recovery_rate: recovery, status: status, zone: null, isKeyZone: false };
}

const METRO_PREFIX = {
    "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
    "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시"
};

// 2) Census GeoJSON Dynamic loading & mapping
async function loadMunicipalitiesGeoJSON(generateDistrictPolygon) {
    console.log("Requesting Census GeoJSON Outline database...");
    const mapSpinner = document.getElementById("map-loading-spinner");
    
    try {
        const response = await fetch('skorea_municipalities_simple.json');
        if (!response.ok) throw new Error("CORS file read limit");
        const data = await response.json();
        cachedGeoData = data;
        if (mapSpinner) mapSpinner.classList.add("hidden");
        renderGeoJSONLayers();
    } catch (err) {
        console.warn("Local fetch skorea_municipalities_simple.json CORS blocking active. Trying static mockup.");
        if (mapSpinner) mapSpinner.classList.add("hidden");
        
        // Backup mock loading
        const backupGeo = {
            type: "FeatureCollection",
            features: mockZones.map((z, idx) => {
                const center = z.zone_center;
                const mockCode = "990" + idx;
                return {
                    type: "Feature",
                    properties: { code: mockCode, name: z.zone_name },
                    geometry: {
                        type: "Polygon",
                        coordinates: [generateDistrictPolygon(z.zone_id, center[0], center[1])]
                    }
                };
            })
        };
        cachedGeoData = backupGeo;
        renderGeoJSONLayers();
    }
}

export function renderGeoJSONLayers() {
    if (!cachedGeoData) return;

    allMunicipalityLayers.forEach(l => {
        desktopMap.removeLayer(l);
        mobileMap.removeLayer(l);
    });
    allMunicipalityLayers = [];

    // Clear previous circles
    Object.values(desktopMapCircles).forEach(c => desktopMap.removeLayer(c));
    Object.values(mobileMapCircles).forEach(c => mobileMap.removeLayer(c));
    desktopMapCircles = {};
    mobileMapCircles = {};

    // Split features: 광역시(metro) vs 일반 시/군(plain)
    const features = cachedGeoData.features || [];
    const metroGroups = {}; // prefix -> [feature, ...]
    const plainFeatures = [];
    features.forEach(f => {
        const prefix = (f.properties.code || "").slice(0, 2);
        if (METRO_PREFIX[prefix]) {
            if (!metroGroups[prefix]) metroGroups[prefix] = [];
            metroGroups[prefix].push(f);
        } else {
            plainFeatures.push(f);
        }
    });

    // 광역시 expand/collapse 상태
    const metroState = { expandedPrefix: null, entries: {} };

    function collapseExpandedMetro() {
        const prefix = metroState.expandedPrefix;
        if (!prefix) return;
        const entry = metroState.entries[prefix];
        if (entry.districtLayer && desktopMap.hasLayer(entry.districtLayer)) desktopMap.removeLayer(entry.districtLayer);
        if (entry.frameLayer && desktopMap.hasLayer(entry.frameLayer)) desktopMap.removeLayer(entry.frameLayer);
        if (entry.metroLayer && !desktopMap.hasLayer(entry.metroLayer)) entry.metroLayer.addTo(desktopMap);
        metroState.expandedPrefix = null;
    }

    function expandMetro(prefix) {
        if (metroState.expandedPrefix && metroState.expandedPrefix !== prefix) collapseExpandedMetro();
        if (metroState.expandedPrefix === prefix) { collapseExpandedMetro(); return; }
        const entry = metroState.entries[prefix];
        if (entry.metroLayer && desktopMap.hasLayer(entry.metroLayer)) desktopMap.removeLayer(entry.metroLayer);
        if (entry.districtLayer) entry.districtLayer.addTo(desktopMap);
        if (entry.frameLayer) entry.frameLayer.addTo(desktopMap);
        desktopMap.fitBounds(entry.bounds, { padding: [20, 20] });
        metroState.expandedPrefix = prefix;
    }

    function districtStyle(feature) {
        const data = getMunicipalityData(feature.properties.code, feature.properties.name);
        return {
            fillColor: getStatusColor(data.status),
            weight: 0.6,
            opacity: 0.7,
            color: 'rgba(255, 255, 255, 0.35)',
            fillOpacity: 0.35
        };
    }

    function updateLegendCard(districtData) {
        const cardRegionTitle = document.getElementById("legend-region-title");
        const cardRegionRecovery = document.getElementById("legend-region-recovery");
        const cardRegionStatus = document.getElementById("legend-region-status");
        const cardEnvRating = document.getElementById("legend-env-rating");
        const cardDiaryBody = document.getElementById("legend-diary-body");
        if (cardRegionTitle) cardRegionTitle.textContent = `${districtData.name} 복원 지구`;
        if (cardRegionRecovery) cardRegionRecovery.textContent = `${districtData.recovery_rate}%`;
        if (cardRegionStatus) {
            cardRegionStatus.textContent = districtData.status;
            cardRegionStatus.className = `status-pill ${districtData.status === "봉쇄" ? "pill-danger" : (districtData.status === "예약가능" ? "pill-warning" : "pill-success")}`;
        }
        if (cardEnvRating) cardEnvRating.textContent = districtData.recovery_rate >= 80 ? "안심 (A)" : (districtData.recovery_rate >= 55 ? "주의 (B)" : "위험 (C)");
        if (cardDiaryBody) {
            cardDiaryBody.innerHTML = `
                <strong>안내:</strong> 본 구역은 대한민국 기후대피정부 250개 정화 구역 중 하나입니다.<br/>
                <strong>복원 지표:</strong> 토양 PPM 및 수자원 복구 진척율 ${districtData.recovery_rate}% 수준에 도달하여 현재 <strong>[${districtData.status}]</strong> 등급으로 관제 분류되어 보존 관리 중입니다.
            `;
        }
    }

    // onEachFeature factory: metroPrefix=null이면 일반 시/군 (클릭 시 현재 광역시 축소)
    function makeOnEachFeature(metroPrefix, parentLayer) {
        return function(feature, layer) {
            const data = getMunicipalityData(feature.properties.code, feature.properties.name);
            const tooltipContent = `
                <div class="map-tooltip">
                    <strong>${data.name}</strong><br/>
                    복구율: <span class="badge-accent">${data.recovery_rate}%</span><br/>
                    상태: <span class="status-badge status-${data.status === "봉쇄" ? "red" : (data.status === "예약가능" ? "orange" : "green")}">${data.status}</span>
                </div>
            `;
            layer.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95 });
            layer.on({
                mouseover: (e) => {
                    if (navigatorModeActive) { layer.closeTooltip(); return; }
                    e.target.setStyle({ fillOpacity: 0.55, weight: 2, color: '#3B82F6' });
                },
                mouseout: (e) => {
                    if (navigatorModeActive) return;
                    if (parentLayer) parentLayer.resetStyle(e.target);
                    else e.target.setStyle(districtStyle(feature));
                },
                click: (e) => {
                    if (navigatorModeActive) {
                        if (e.originalEvent && typeof e.originalEvent.stopPropagation === "function") e.originalEvent.stopPropagation();
                        L.DomEvent.stopPropagation(e);
                        handleNavigatorClick(e.latlng);
                        return;
                    }
                    if (!metroPrefix) collapseExpandedMetro();
                    if (data.zone) {
                        window.selectZone(data.zone.zone_id);
                    } else {
                        updateLegendCard(data);
                    }
                }
            });
        };
    }

    // 1) 일반 시/군
    const plainCollection = { type: "FeatureCollection", features: plainFeatures };
    const dGeoLayer = L.geoJSON(plainCollection, {
        style: districtStyle,
        onEachFeature: makeOnEachFeature(null, null)
    }).addTo(desktopMap);
    allMunicipalityLayers.push(dGeoLayer);

    // 2) 광역시 — 처음엔 통합 뷰, 클릭하면 구/군 상세 뷰
    Object.keys(metroGroups).forEach(prefix => {
        const cityFeatures = metroGroups[prefix];
        const cityName = METRO_PREFIX[prefix];
        const cityCollection = { type: "FeatureCollection", features: cityFeatures };

        // 평균 복구율/상태
        const avgRecovery = Math.round(cityFeatures.reduce((sum, f) => {
            return sum + getMunicipalityData(f.properties.code, f.properties.name).recovery_rate;
        }, 0) / cityFeatures.length);
        const avgStatus = avgRecovery >= 82 ? "귀향시작" : avgRecovery >= 55 ? "예약가능" : "봉쇄";
        const avgPollution = Math.round((100 - avgRecovery) * 10) / 10;
        const avgColor = getStatusColor(avgStatus);

        const districtLayer = L.geoJSON(cityCollection, {
            style: districtStyle,
            onEachFeature: makeOnEachFeature(prefix, null)
        });

        const frameLayer = L.geoJSON(cityCollection, {
            style: () => ({ fill: false, color: "#1e293b", weight: 3, opacity: 0.85, dashArray: "6 4" }),
            interactive: false
        });

        const metroLayer = L.geoJSON(cityCollection, {
            style: () => ({ color: avgColor, weight: 0, fillColor: avgColor, fillOpacity: 0.5 }),
            onEachFeature: (feature, layer) => {
                layer.bindTooltip(`<div class="map-tooltip"><strong>📍 ${cityName}</strong><br/>평균 복구율: <span class="badge-accent">${avgRecovery}%</span><br/>상태: ${avgStatus}<br/><span style="font-size:11px;color:#64748B;">클릭하면 구·군별 상세 보기</span></div>`, { sticky: true, opacity: 0.95 });
                layer.on({
                    mouseover: () => { if (!navigatorModeActive) layer.setStyle({ fillOpacity: 0.68 }); },
                    mouseout: () => { if (!navigatorModeActive) layer.setStyle({ fillOpacity: 0.5 }); },
                    click: (e) => {
                        if (navigatorModeActive) {
                            if (e.originalEvent && typeof e.originalEvent.stopPropagation === "function") e.originalEvent.stopPropagation();
                            L.DomEvent.stopPropagation(e);
                            handleNavigatorClick(e.latlng);
                            return;
                        }
                        expandMetro(prefix);
                    }
                });
            }
        }).addTo(desktopMap);

        metroState.entries[prefix] = { metroLayer, districtLayer, frameLayer, bounds: metroLayer.getBounds() };
        allMunicipalityLayers.push(metroLayer);
    });

    const mGeoLayer = L.geoJSON(cachedGeoData, {
        style: (feature) => {
            const data = getMunicipalityData(feature.properties.code, feature.properties.name);
            const fillColor = getStatusColor(data.status);
            return {
                fillColor: fillColor,
                weight: 1.0,
                opacity: 0.8,
                color: 'rgba(255, 255, 255, 0.4)',
                fillOpacity: 0.3
            };
        }
    }).addTo(mobileMap);
    allMunicipalityLayers.push(mGeoLayer);

    // 2) Main Circles for key zones
    const activeZones = window.zonesData || mockZones;
    activeZones.forEach(z => {
        const center = z.zone_center;
        const color = getStatusColor(z.status);

        const dCircle = L.circleMarker(center, {
            radius: 8,
            fillColor: color,
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
            zIndexOffset: 1000
        }).addTo(desktopMap);

        dCircle.on("click", () => {
            window.selectZone(z.zone_id);
        });
        desktopMapCircles[z.zone_id] = dCircle;

        const mCircle = L.circleMarker(center, {
            radius: 6,
            fillColor: color,
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(mobileMap);
        mobileMapCircles[z.zone_id] = mCircle;
    });
}

// 3) Safe Path Finder Logic (REAL ROAD OSRM Routing + Blocked Zone Bypassing)

export function toggleNavigationMode() {
    const btnToggleNav = document.getElementById("btn-toggle-navigator");
    const navStatusPanel = document.getElementById("desktop-navigator-status-panel");
    const navStatusText = document.getElementById("desktop-navigator-status");

    navigatorModeActive = !navigatorModeActive;

    if (navigatorModeActive) {
        resetNavigator();
        if (btnToggleNav) {
            btnToggleNav.classList.add("active");
            btnToggleNav.innerHTML = '<i data-lucide="x" style="width: 16px; height: 16px;"></i> 탐색 모드 끄기';
        }
        if (navStatusPanel) navStatusPanel.classList.remove("hidden");
        if (navStatusText) navStatusText.textContent = "지도를 클릭해 출발지를 선택하세요.";
        desktopMap.getContainer().style.cursor = "crosshair";
    } else {
        if (btnToggleNav) {
            btnToggleNav.classList.remove("active");
            btnToggleNav.innerHTML = '<i data-lucide="navigation" style="width: 16px; height: 16px;"></i> 기후피난 안전경로 찾기';
        }
        if (navStatusPanel) navStatusPanel.classList.add("hidden");
        resetNavigator();
        desktopMap.getContainer().style.cursor = "";
    }
    lucide.createIcons();
}

function handleNavigatorClick(latlng) {
    const setNavStatusText = window.setNavStatusText || console.log;
    const point = [latlng.lat, latlng.lng];

    if (navPoints.length === 0) {
        navPoints.push(point);
        // 사각형 잔상이 생기지 않고 지극히 슬림하고 영롱한 벡터 원형 마커 장착
        const marker = L.circleMarker(point, {
            radius: 4.5,
            fillColor: '#2563EB', // 피난 출발 블루
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(desktopMap);
        navMarkers.push(marker);
        setNavStatusText("출발지가 등록되었습니다. 지도를 터치해 목적지를 선택하세요.");
    } else if (navPoints.length === 1) {
        navPoints.push(point);
        const marker = L.circleMarker(point, {
            radius: 4.5,
            fillColor: '#DC2626', // 피난 목적 레드
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(desktopMap);
        navMarkers.push(marker);
        
        drawSafeRoute(navPoints[0], navPoints[1]);
    }
}

export function resetNavigator() {
    navPoints = [];
    navMarkers.forEach(m => desktopMap.removeLayer(m));
    navMarkers = [];
    if (navRouteLine) {
        if (navRouteLine._outline) desktopMap.removeLayer(navRouteLine._outline);
        desktopMap.removeLayer(navRouteLine);
        navRouteLine = null;
    }
    
    const setNavStatusText = window.setNavStatusText || console.log;
    setNavStatusText("지도를 클릭해 출발지를 선택하세요.");

    // 왼쪽 하단 안전경로 안내 HUD 숨김 처리
    const routeWidget = document.getElementById("map-route-widget");
    if (routeWidget) routeWidget.classList.add("hidden");
}

// ── 라우팅 엔진 ────────────────────────────────────────────────────────────────

// GeoJSON ring [lng, lat] 기준 point-in-polygon
function pointInRing(lat, lng, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [x1, y1] = [ring[i][0], ring[i][1]]; // lng, lat
        const [x2, y2] = [ring[j][0], ring[j][1]];
        if (((y1 > lat) !== (y2 > lat)) && (lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1)) {
            inside = !inside;
        }
    }
    return inside;
}

// 봉쇄 구역 폴리곤 목록 — 라우팅용이므로 타임라인 무시하고 현재 기준(t=0.5) 고정
function getBlockedRings() {
    if (!cachedGeoData) return [];
    const savedT = window.timelinePercentage;
    window.timelinePercentage = 0.5;
    const rings = [];
    cachedGeoData.features.forEach(f => {
        if (getMunicipalityData(f.properties.code, f.properties.name).status !== "봉쇄") return;
        const g = f.geometry;
        if (g.type === "Polygon") rings.push(g.coordinates[0]);
        else if (g.type === "MultiPolygon") g.coordinates.forEach(p => rings.push(p[0]));
    });
    window.timelinePercentage = savedT;
    return rings;
}

function isBlocked(lat, lng, rings) {
    return rings.some(r => pointInRing(lat, lng, r));
}

// OSRM 실제 도로 요청. waypoints: [[lat,lng], ...]
async function osrmRoute(waypoints) {
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const json = await res.json();
        const r = json.routes && json.routes[0];
        if (!r) return null;
        return {
            coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            distance: r.distance,
            duration: r.duration
        };
    } catch {
        return null;
    }
}

// 경로 좌표 중 봉쇄 구역 통과 여부 샘플링 체크
function routePassesBlocked(coords, rings) {
    // 좌표 수가 많으면 10개 간격으로 샘플링
    const step = Math.max(1, Math.floor(coords.length / 30));
    for (let i = 0; i < coords.length; i += step) {
        if (isBlocked(coords[i][0], coords[i][1], rings)) return true;
    }
    return false;
}

// 봉쇄 구역을 우회하는 경유지 후보 탐색
// 출발→도착 직선을 따라 여러 t 지점에서 수직 방향으로 오프셋
function findBypassVia(start, end, rings) {
    const dLat = end[0] - start[0];
    const dLng = end[1] - start[1];
    const len = Math.sqrt(dLat * dLat + dLng * dLng);
    // 수직 단위 벡터
    const perpLat = -dLng / len;
    const perpLng = dLat / len;

    const offsets = [0.08, 0.15, 0.22, 0.30]; // 약 8~30km
    const tValues = [0.3, 0.5, 0.7, 0.2, 0.8]; // 직선 위치 비율

    for (const t of tValues) {
        const baseLat = start[0] + dLat * t;
        const baseLng = start[1] + dLng * t;
        for (const off of offsets) {
            for (const sign of [1, -1]) {
                const via = [baseLat + perpLat * off * sign, baseLng + perpLng * off * sign];
                if (!isBlocked(via[0], via[1], rings)) return via;
            }
        }
    }
    return null;
}

export async function drawSafeRoute(start, end) {
    const status = window.setNavStatusText || (() => {});
    status("🛣️ 경로 탐색 중...");

    const rings = getBlockedRings();
    let route = await osrmRoute([start, end]);
    let bypassed = false;

    // 직통 경로가 봉쇄 구역 통과 → 우회 시도
    if (route && routePassesBlocked(route.coords, rings)) {
        const via = findBypassVia(start, end, rings);
        const alt = via ? await osrmRoute([start, via, end]) : null;
        if (alt && !routePassesBlocked(alt.coords, rings)) {
            route = alt;
            bypassed = true;
        } else {
            // 우회도 실패 → 직선 fallback
            route = null;
        }
    }

    // OSRM 실패 fallback: 직선
    const coords = route ? route.coords : [start, end];
    const distKm = route ? (route.distance / 1000).toFixed(1) : (haversineDist(start, end)).toFixed(1);
    const totalSec = route ? route.duration : null;
    const etaText = totalSec != null
        ? (totalSec >= 3600 ? `${Math.floor(totalSec / 3600)}시간 ${Math.round((totalSec % 3600) / 60)}분` : `${Math.round(totalSec / 60)}분`)
        : "알 수 없음";
    const distText = `${distKm} km`;
    const statusLabel = bypassed ? "⚠️ 안전 우회" : "🟢 직통";

    if (navRouteLine) { desktopMap.removeLayer(navRouteLine); navRouteLine = null; }

    navRouteLine = L.polyline(coords, {
        color: bypassed ? "#EA580C" : "#2563EB",
        weight: 2.5,
        opacity: 0.92,
        lineJoin: "round",
        lineCap: "round"
    }).addTo(desktopMap);

    desktopMap.fitBounds(navRouteLine.getBounds(), { padding: [48, 48], animate: true });
    status(`🧭 탐색 완료 — ${statusLabel} | ${etaText} | ${distText}`);
    updateRouteWidget(distText, etaText, bypassed);
}

function haversineDist([lat1, lng1], [lat2, lng2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateRouteWidget(dist, eta, bypassed) {
    const widget = document.getElementById("map-route-widget");
    if (!widget) return;
    const etaEl = document.getElementById("route-eta-val");
    const distEl = document.getElementById("route-dist-val");
    const statusEl = document.getElementById("route-bypass-status");
    if (etaEl) etaEl.textContent = eta;
    if (distEl) distEl.textContent = dist;
    if (statusEl) {
        statusEl.textContent = bypassed ? "🟠 안전 우회로 작동중" : "🟢 안전 경로 작동중";
        statusEl.style.color = bypassed ? "#EA580C" : "#16A34A";
    }
    widget.classList.remove("hidden");
}
