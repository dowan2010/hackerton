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
    const recovery = Math.max(5, Math.min(98, Math.round((30 + randVal * 68 + bias - warmingPenalty) * 10) / 10));
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

function pointInPolygonRing(lat, lng, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getBlockedPolygons() {
    if (!cachedGeoData) return [];
    const polys = [];
    cachedGeoData.features.forEach(f => {
        const data = getMunicipalityData(f.properties.code, f.properties.name);
        if (data.status !== "봉쇄") return;
        const geom = f.geometry;
        if (geom.type === "Polygon") polys.push(geom.coordinates[0]);
        else if (geom.type === "MultiPolygon") geom.coordinates.forEach(p => polys.push(p[0]));
    });
    return polys;
}

function isLatLngBlocked(lat, lng, blockedRings) {
    for (const ring of blockedRings) {
        if (pointInPolygonRing(lat, lng, ring)) return true;
    }
    return false;
}

// OSRM API Route Downloader Helper
async function fetchOSRMRoute(waypoints) {
    const coordsStr = waypoints.map(wp => `${wp[1]},${wp[0]}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]), // OSRM [lng, lat] -> Leaflet [lat, lng]
                    distance: route.distance, // meters
                    duration: route.duration // seconds
                };
            }
        }
    } catch (e) {
        console.error("OSRM Route fetching failed, fallback to direct line.", e);
    }
    return null;
}

export function findSafeRoute(start, end, blockedRings) {
    const GRID = 32;
    const pad = 0.08;
    const latMin = Math.min(start[0], end[0]) - pad;
    const latMax = Math.max(start[0], end[0]) + pad;
    const lngMin = Math.min(start[1], end[1]) - pad;
    const lngMax = Math.max(start[1], end[1]) + pad;
    const latStep = (latMax - latMin) / GRID;
    const lngStep = (lngMax - lngMin) / GRID;

    function toCell(lat, lng) {
        return [Math.round((lat - latMin) / latStep), Math.round((lng - lngMin) / lngStep)];
    }
    function toLatLng(r, c) {
        return [latMin + r * latStep, lngMin + c * lngStep];
    }
    const startCell = toCell(start[0], start[1]);
    const endCell = toCell(end[0], end[1]);

    function isBlockedCell(r, c) {
        if ((r === startCell[0] && c === startCell[1]) || (r === endCell[0] && c === endCell[1])) return false;
        if (r < 0 || r > GRID || c < 0 || c > GRID) return true;
        const [lat, lng] = toLatLng(r, c);
        return isLatLngBlocked(lat, lng, blockedRings);
    }

    const key = (r, c) => r + "," + c;
    const visited = new Set([key(startCell[0], startCell[1])]);
    const queue = [[startCell, [startCell]]];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    let foundPath = null;

    while (queue.length) {
        const [cur, path] = queue.shift();
        if (cur[0] === endCell[0] && cur[1] === endCell[1]) { foundPath = path; break; }
        for (const [dr, dc] of dirs) {
            const nr = cur[0] + dr, nc = cur[1] + dc;
            const k = key(nr, nc);
            if (visited.has(k)) continue;
            if (isBlockedCell(nr, nc)) continue;
            visited.add(k);
            queue.push([[nr, nc], [...path, [nr, nc]]]);
        }
    }

    if (!foundPath) return [start, end];
    const raw = foundPath.map(([r, c]) => toLatLng(r, c));
    // Ramer-Douglas-Peucker simplification to remove grid staircase noise
    return rdpSimplify(raw, 0.003);
}

function rdpSimplify(points, epsilon) {
    if (points.length < 3) return points;
    let maxDist = 0, maxIdx = 0;
    const [lat1, lng1] = points[0];
    const [lat2, lng2] = points[points.length - 1];
    const denom = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2);
    for (let i = 1; i < points.length - 1; i++) {
        const [lat, lng] = points[i];
        const dist = denom === 0 ? Math.sqrt((lat - lat1) ** 2 + (lng - lng1) ** 2)
            : Math.abs((lat2 - lat1) * (lng1 - lng) - (lat1 - lat) * (lng2 - lng1)) / denom;
        if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }
    if (maxDist > epsilon) {
        const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
        const right = rdpSimplify(points.slice(maxIdx), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [points[0], points[points.length - 1]];
}

export async function drawSafeRoute(start, end) {
    const blockedRings = getBlockedPolygons();
    const setNavStatusText = window.setNavStatusText || console.log;
    
    setNavStatusText("🛣️ 실제 도로망 분석 및 기후 안심 우회 경로 탐색 가동 중...");

    // 1) Direct road search first
    let routeData = await fetchOSRMRoute([start, end]);
    let needsBypass = false;

    if (routeData) {
        for (const pt of routeData.coordinates) {
            if (isLatLngBlocked(pt[0], pt[1], blockedRings)) {
                needsBypass = true;
                break;
            }
        }
    } else {
        needsBypass = true;
    }

    // 2) If the route penetrates blocked zone, calculate best bypass waypoints
    if (needsBypass && routeData) {
        console.log("[NAV] 차단 장벽 감지! 안전 우회 경유 노드 연산 중...");
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;

        // Try bypass offsets around the center (Approx 10~15km deviations)
        const offsets = [
            [0.10, 0.10],   // NE
            [-0.10, 0.10],  // SE
            [0.10, -0.10],  // NW
            [-0.10, -0.10], // SW
            [0.0, 0.15],    // E
            [0.0, -0.15],   // W
            [0.15, 0.0],    // N
            [-0.15, 0.0]    // S
        ];

        let bestVia = null;
        for (const [oLat, oLng] of offsets) {
            const candidateVia = [midLat + oLat, midLng + oLng];
            if (!isLatLngBlocked(candidateVia[0], candidateVia[1], blockedRings)) {
                bestVia = candidateVia;
                break;
            }
        }

        if (bestVia) {
            const bypassRoute = await fetchOSRMRoute([start, bestVia, end]);
            if (bypassRoute) {
                let secondCheckPassed = true;
                for (const pt of bypassRoute.coordinates) {
                    if (isLatLngBlocked(pt[0], pt[1], blockedRings)) {
                        secondCheckPassed = false;
                        break;
                    }
                }
                if (secondCheckPassed) {
                    routeData = bypassRoute;
                    console.log("[NAV] 실제 도로 우회 안전 경로 획득 완료.");
                }
            }
        }
    }

    // 3) Format distance, duration, rendering
    let routeLatLngs;
    let distanceText = "계산 불가";
    let etaText = "계산 불가";
    let isBypassedLabel = needsBypass ? "⚠️ 안전 우회 통과" : "🟢 직통 안전 개방";

    if (routeData) {
        routeLatLngs = routeData.coordinates;
        const distKm = (routeData.distance / 1000).toFixed(1);
        distanceText = `${distKm} km`;
        
        const totalSec = routeData.duration;
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.round((totalSec % 3600) / 60);
        etaText = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
    } else {
        // Fallback to BFS grid path
        routeLatLngs = findSafeRoute(start, end, blockedRings);
        const distanceSim = (start[0] !== end[0]) ? (Math.abs(start[0] - end[0]) * 111).toFixed(1) : "5.4";
        distanceText = `${distanceSim} km (격자)`;
        etaText = `${Math.round(distanceSim * 1.5)}분`;
    }

    if (navRouteLine) {
        if (navRouteLine._outline) desktopMap.removeLayer(navRouteLine._outline);
        desktopMap.removeLayer(navRouteLine);
        navRouteLine = null;
    }
    // 외곽선 레이어 (흰 테두리) + 메인 라인 두 겹으로 선명하게
    const routeOutline = L.polyline(routeLatLngs, {
        color: "#ffffff",
        weight: 4,
        opacity: 0.6
    }).addTo(desktopMap);
    navRouteLine = L.polyline(routeLatLngs, {
        color: needsBypass ? "#EA580C" : "#2563EB",
        weight: 2,
        opacity: 0.95
    }).addTo(desktopMap);
    navRouteLine._outline = routeOutline;
    
    desktopMap.fitBounds(navRouteLine.getBounds(), { padding: [40, 40] });

    // Store in global window for cross-tab sharing
    window.lastCalculatedRoute = {
        distance: distanceText,
        eta: etaText,
        status: isBypassedLabel
    };

    setNavStatusText(`🧭 실제 도로 안전우회 경로 탐색 완료 — 예상 시간: [ ${etaText} ] | 실주행 거리: [ ${distanceText} ] (${isBypassedLabel})`);

    // Injects highly-aesthetic ETA widgets inside the legend env card
    updateRouteWidgetUI(distanceText, etaText, isBypassedLabel);
}

function updateRouteWidgetUI(dist, eta, status) {
    const routeWidget = document.getElementById("map-route-widget");
    if (!routeWidget) return;

    const etaVal = document.getElementById("route-eta-val");
    const distVal = document.getElementById("route-dist-val");
    const bypassStatus = document.getElementById("route-bypass-status");

    if (etaVal) etaVal.textContent = eta;
    if (distVal) distVal.textContent = dist;
    if (bypassStatus) {
        if (status.includes("우회")) {
            bypassStatus.innerHTML = "🟠 안전 우회로 작동중";
            bypassStatus.style.color = "#EA580C";
        } else {
            bypassStatus.innerHTML = "🟢 안전 경로 작동중";
            bypassStatus.style.color = "#16A34A";
        }
    }

    // 왼쪽 하단에 스르륵 투명 등장
    routeWidget.classList.remove("hidden");
    routeWidget.style.animation = "slideUpFadeIn 0.3s ease";
}
