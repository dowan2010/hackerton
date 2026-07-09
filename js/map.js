// js/map.js
// Leaflet Map & Safe Route Navigation Engine Module
import { mockZones } from './data.js';

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
    if (prefix === "37" || prefix === "38") return -15; // 경북·경남
    if (prefix === "31") return -15; // 경기
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

    function bindDistrictFeature(metroPrefix) {
        return function(feature, layer) {
            const data = getMunicipalityData(feature.properties.code, feature.properties.name);
            const pollution = Math.round((100 - data.recovery_rate) * 10) / 10;
            layer.bindPopup(`<strong>📍 ${data.name}</strong><br>오염도: ${pollution}%<br>복구율: ${data.recovery_rate}%<br>통제 상태: <strong>${data.status}</strong>`);
            if (data.zone) mapCircles[data.zone.zone_id] = layer;
            if (isDesktop) allMunicipalityLayers.push({ layer, code: feature.properties.code, name: feature.properties.name, isKeyZone: data.isKeyZone });
            layer.on("click", (e) => {
                if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                if (isDesktop && navigatorModeActive) { handleNavigatorClick(e.latlng); return; }
                if (!metroPrefix) collapseExpandedMetro();
                map.setView(layer.getBounds().getCenter(), zoomOnClick, { animate: true });
                if (data.zone && window.selectZone) window.selectZone(data.zone.zone_id);
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

    L.geoJSON({ type: "FeatureCollection", features: plainFeatures }, {
        style: districtStyle,
        onEachFeature: bindDistrictFeature(null)
    }).addTo(map);

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
        });

        const frameLayer = L.geoJSON(cityCollection, {
            style: () => ({ fill: false, color: "#1e293b", weight: isDesktop ? 3 : 2, opacity: 0.85, dashArray: "6 4" }),
            interactive: false
        });

        const metroLayer = L.geoJSON(cityCollection, {
            style: () => ({ color: getStatusColor(avgStatus), weight: 0, fillColor: getStatusColor(avgStatus), fillOpacity: 0.5 }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<strong>📍 ${cityName}</strong><br>평균 오염도: ${avgPollution}%<br>평균 복구율: ${avgRecovery}%<br>통제 상태: <strong>${avgStatus}</strong><br><span style="font-size:11px;color:#64748B;">클릭하면 구·군별 상세 보기</span>`);
                layer.on("click", (e) => {
                    if (isDesktop && navigatorModeActive) { handleNavigatorClick(e.latlng); return; }
                    expandMetro(prefix);
                });
                if (isDesktop) {
                    layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.68 }));
                    layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.5 }));
                }
            }
        }).addTo(map);

        metroState.entries[prefix] = { metroLayer, districtLayer, frameLayer, bounds: metroLayer.getBounds() };
    });
}

async function loadMunicipalitiesGeoJSON(generateDistrictPolygon) {
    try {
        console.log("[GeoJSON] Loading South Korea simple boundaries...");
        const res = await fetch("./skorea_municipalities_simple.json");
        if (!res.ok) throw new Error("Local GeoJSON load fail");
        const geoData = await res.json();
        cachedGeoData = geoData;

        renderMunicipalities(geoData, desktopMap, desktopMapCircles, true);
        renderMunicipalities(geoData, mobileMap, mobileMapCircles, false);

        // Global + Newly Added Exception nodes rendering
        const targetZones = window.zonesData || mockZones;
        const DUPLICATE_COUNTY_ZONES = ["KR-GW-01", "KR-GW-02"];
        targetZones.forEach(zone => {
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

                deskPoly.on("click", (e) => {
                    if (navigatorModeActive) { handleNavigatorClick(e.latlng); return; }
                    desktopMap.setView([zone.lat, zone.lng], 9, { animate: true });
                    if (window.selectZone) window.selectZone(zone.zone_id);
                });
                mobPoly.on("click", () => {
                    mobileMap.setView([zone.lat, zone.lng], 8, { animate: true });
                    if (window.selectZone) window.selectZone(zone.zone_id);
                });
            }
        });

        console.log("[GeoJSON Modular SUCCESS] South Korea municipalities boundaries merged perfectly.");
    } catch (err) {
        console.warn("[WARN] GeoJSON load fail, drawing backup polygons:", err);
        drawBackupPolygons(generateDistrictPolygon);
    }
}

function drawBackupPolygons(generateDistrictPolygon) {
    const targetZones = window.zonesData || mockZones;
    targetZones.forEach(zone => {
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
            if (window.selectZone) window.selectZone(zone.zone_id);
        };

        deskCircle.on("click", handleCircleClick);
        mobCircle.on("click", handleCircleClick);
    });
}

// 2) Navigation & Wayfinder Engine
export function handleNavigatorClick(latlng) {
    if (navPoints.length >= 2) resetNavigator();

    navPoints.push([latlng.lat, latlng.lng]);
    const color = navPoints.length === 1 ? "#2563EB" : "#ef4444";
    const marker = L.circleMarker(latlng, { radius: 7, color, fillColor: color, fillOpacity: 1 }).addTo(desktopMap);
    navMarkers.push(marker);

    const setNavStatusText = window.setNavStatusText || console.log;

    if (navPoints.length === 1) {
        setNavStatusText("도착지를 클릭하세요.");
    } else if (navPoints.length === 2) {
        setNavStatusText("봉쇄 구역을 피해 경로를 계산 중...");
        drawSafeRoute(navPoints[0], navPoints[1]);
    }
}

export function resetNavigator() {
    navPoints = [];
    navMarkers.forEach(m => desktopMap.removeLayer(m));
    navMarkers = [];
    if (navRouteLine) { desktopMap.removeLayer(navRouteLine); navRouteLine = null; }
    
    const setNavStatusText = window.setNavStatusText || console.log;
    setNavStatusText("지도를 클릭해 출발지를 선택하세요.");
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
    return foundPath.map(([r, c]) => toLatLng(r, c));
}

export function drawSafeRoute(start, end) {
    const blockedRings = getBlockedPolygons();
    const routeLatLngs = findSafeRoute(start, end, blockedRings);

    if (navRouteLine) desktopMap.removeLayer(navRouteLine);
    navRouteLine = L.polyline(routeLatLngs, { color: "#2563EB", weight: 4, opacity: 0.85, dashArray: "8 4" }).addTo(desktopMap);
    desktopMap.fitBounds(navRouteLine.getBounds(), { padding: [30, 30] });

    const setNavStatusText = window.setNavStatusText || console.log;
    setNavStatusText(`경로 탐색 완료 — 우회 대상 봉쇄 구역 ${blockedRings.length}곳.`);
}
