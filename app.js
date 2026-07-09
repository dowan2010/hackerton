/* -------------------------------------------------------------
 * RootHome National Climate Risk Portal (app.js - Modular Coordinator)
 * Coordinates and bootstraps specialized JS modules.
 * ------------------------------------------------------------- */

import { mockZones, zoneDiaries, zoneFutureTimelines } from './js/data.js';
import { 
    initLeafletMaps, 
    desktopMap, 
    mobileMap, 
    desktopMapCircles, 
    mobileMapCircles, 
    setNavigatorModeActive, 
    resetNavigator, 
    getStatusColor,
    getMunicipalityData,
    allMunicipalityLayers,
    cachedGeoData
} from './js/map.js';
import { initDignitySystem, initNationalPolicyGenerator } from './js/dignity.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. GLOBAL STATE & COORDINATION VARIABLES ---
    let activeTab = "rootmap"; // 'rootmap' / 'dignity' / 'timeline'
    let timelinePercentage = 0.5; // Default slider position (0~1)
    let predictionsData = null; // Predictive Machine Learning 50-year dataset cache

    // Bind state to window so other modules can dynamically read/write
    window.zonesData = [...mockZones];
    window.selectedZoneId = "KR-GW-03"; // Default: 아야진리
    window.warmingDegrees = 0.0;
    
    // Auto-resolve Backend URL depending on local/production context
    window.backendUrl = `https://roothome-backend-686146847894.asia-northeast3.run.app`;
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        window.backendUrl = "http://127.0.0.1:8000";
    }

    // --- 2. COUNTDOWN TIMELINE SYNC ---
    function updateCountdownDisplay() {
        const zone = window.zonesData.find(z => z.zone_id === window.selectedZoneId);
        const el = document.getElementById("countdown-days");
        if (!zone || !el) return;
        const totalDays = zone.time_to_safe_years > 0 ? Math.round(zone.time_to_safe_years * 365) : 142;
        el.textContent = Math.max(0, Math.round((1 - timelinePercentage) * totalDays));
    }

    // --- 3. SELECTION & DETAILED STATS SYNCHRONIZER ---
    window.selectZone = function(zoneId) {
        window.selectedZoneId = zoneId;
        const zone = window.zonesData.find(z => z.zone_id === zoneId);
        if (!zone) return;

        console.log(`Syncing Zone Details: ${zone.zone_name}`);

        // Update Desktop Information Displays
        const dTitle = document.getElementById("desktop-zone-title");
        const dDesc = document.getElementById("desktop-zone-desc");
        const dStatus = document.getElementById("desktop-zone-status");
        const dRate = document.getElementById("desktop-recovery-rate-val");
        const dBar = document.getElementById("desktop-recovery-bar");
        const dAir = document.getElementById("desktop-air-val");
        const dSoil = document.getElementById("desktop-soil-val");
        const dVeg = document.getElementById("desktop-veg-val");

        if (dTitle) {
            dTitle.innerHTML = `<span class="badge-status status-${zone.status.toLowerCase()}">${zone.status}</span> ${zone.zone_name}`;
        }
        if (dDesc) dDesc.textContent = zone.description;
        if (dStatus) dStatus.textContent = zone.status;
        if (dRate) dRate.textContent = `${zone.recovery_rate}%`;
        if (dBar) dBar.style.width = `${zone.recovery_rate}%`;
        if (dAir) dAir.textContent = `${zone.air_quality}/100`;
        if (dSoil) dSoil.textContent = `${zone.soil_contamination} ppm`;
        if (dVeg) dVeg.textContent = `${zone.vegetation_ndvi} NDVI`;

        // Update Mobile Displays
        const mTitle = document.getElementById("mobile-zone-title");
        const mStatus = document.getElementById("mobile-zone-status");
        const mRate = document.getElementById("mobile-recovery-rate");
        const mBar = document.getElementById("mobile-recovery-bar");
        const mDesc = document.getElementById("mobile-zone-desc");

        if (mTitle) mTitle.textContent = zone.zone_name.split(" - ")[1] || zone.zone_name;
        if (mStatus) {
            mStatus.className = `zone-status-badge status-${zone.status.toLowerCase()}`;
            mStatus.textContent = zone.status;
        }
        if (mRate) mRate.textContent = `${zone.recovery_rate}% 복구`;
        if (mBar) mBar.style.width = `${zone.recovery_rate}%`;
        if (mDesc) mDesc.textContent = zone.description;

        // Visual map focus and popup triggering
        if (desktopMap && desktopMapCircles[zoneId]) {
            desktopMap.setView([zone.lat, zone.lng], desktopMap.getZoom(), { animate: true });
            desktopMapCircles[zoneId].openPopup();
        }
        if (mobileMap && mobileMapCircles[zoneId]) {
            mobileMap.setView([zone.lat, zone.lng], mobileMap.getZoom(), { animate: true });
            mobileMapCircles[zoneId].openPopup();
        }

        updateCountdownDisplay();
        syncTimelineForZone(zoneId);
    };

    // --- 4. Predictive Machine Learning API Integration ---
    async function fetch50YearPredictions() {
        try {
            console.log("[ML API] Fetching 50-year climate predictions...");
            const response = await fetch(`${window.backendUrl}/api/predictions`);
            if (response.ok) {
                predictionsData = await response.json();
                console.log("[ML SUCCESS] 50-year prediction cache loaded.");
            } else {
                throw new Error("Bad response from predictions API");
            }
        } catch (err) {
            console.warn("Backend ML API offline. Using local deterministic fallbacks.");
        }
    }

    function syncTimelineForZone(zoneId) {
        const zone = window.zonesData.find(z => z.zone_id === zoneId);
        if (!zone) return;

        // Get past diary scenario
        const diary = zoneDiaries[zoneId] || "복구 노드가 성공적으로 활성화되어 미세 유해 물질 포집 및 대기 수질 순환이 극히 우수하게 유지되고 있습니다.";
        
        const dText = document.getElementById("desktop-diary-text");
        const mText = document.getElementById("mobile-diary-text");
        if (dText) dText.textContent = diary;
        if (mText) mText.textContent = diary;

        // Load 50-year predictive chart
        const timelineList = zoneFutureTimelines[zoneId] || [];
        const graphContainer = document.getElementById("desktop-predictions-graph");
        const mobileContainer = document.getElementById("mobile-predictions-graph");

        const renderGraph = (container) => {
            if (!container) return;
            container.innerHTML = "";
            timelineList.forEach(pt => {
                const barWrapper = document.createElement("div");
                barWrapper.className = "prediction-bar-wrapper";
                
                const val = pt.recovery_rate;
                const status = val >= 90 ? "귀향시작" : val >= 50 ? "예약가능" : "봉쇄";
                const color = getStatusColor(status);

                barWrapper.innerHTML = `
                    <div class="prediction-bar-label">${pt.year}년</div>
                    <div class="prediction-bar-track">
                        <div class="prediction-bar-fill" style="width: ${val}%; background-color: ${color};"></div>
                    </div>
                    <div class="prediction-bar-value">${val}% (${status})</div>
                `;
                container.appendChild(barWrapper);
            });
        };

        renderGraph(graphContainer);
        renderGraph(mobileContainer);
    }

    // --- 5. TIMELINE CONTROLLERS ---
    function initTimelineDragController() {
        const dHandle = document.getElementById("desktop-timeline-handle");
        const dTrack = document.getElementById("desktop-timeline-track");
        const mHandle = document.getElementById("mobile-timeline-handle");
        const mTrack = document.getElementById("mobile-timeline-track");

        const syncTimelinePos = (pct) => {
            timelinePercentage = Math.max(0, Math.min(1, pct));
            const leftVal = `${timelinePercentage * 100}%`;
            
            if (dHandle) dHandle.style.left = leftVal;
            if (mHandle) mHandle.style.left = leftVal;

            updateCountdownDisplay();
        };

        const setupDrag = (handle, track) => {
            if (!handle || !track) return;
            let isDragging = false;

            const onMove = (clientX) => {
                const rect = track.getBoundingClientRect();
                const pct = (clientX - rect.left) / rect.width;
                syncTimelinePos(pct);
            };

            handle.addEventListener("mousedown", () => { isDragging = true; });
            document.addEventListener("mousemove", (e) => { if (isDragging) onMove(e.clientX); });
            document.addEventListener("mouseup", () => { isDragging = false; });

            handle.addEventListener("touchstart", () => { isDragging = true; });
            document.addEventListener("touchmove", (e) => {
                if (isDragging && e.touches.length > 0) onMove(e.touches[0].clientX);
            });
            document.addEventListener("touchend", () => { isDragging = false; });
        };

        setupDrag(dHandle, dTrack);
        setupDrag(mHandle, mTrack);
        syncTimelinePos(0.5); // Start at midpoint
    }

    // --- 6. NAVIGATION ENGINE TRIGGER BRIDGE ---
    window.setNavStatusText = function(text) {
        const el = document.getElementById("desktop-navigator-status");
        if (el) el.textContent = text;
    };

    function toggleNavigatorMode() {
        const btn = document.getElementById("btn-toggle-navigator");
        const panel = document.getElementById("desktop-navigator-status-panel");
        if (!btn || !panel) return;

        const isActivating = !btn.classList.contains("active");
        setNavigatorModeActive(isActivating);

        if (isActivating) {
            btn.classList.add("active");
            btn.innerHTML = '<i data-lucide="navigation-off" style="width: 16px; height: 16px;"></i> 내비게이터 종료';
            panel.classList.remove("hidden");
            window.setNavStatusText("지도를 클릭해 출발지를 선택하세요.");
        } else {
            btn.classList.remove("active");
            btn.innerHTML = '<i data-lucide="navigation" style="width: 16px; height: 16px;"></i> 기후피난 안전경로 찾기';
            panel.classList.add("hidden");
            resetNavigator();
        }
        lucide.createIcons();
    }

    const btnNav = document.getElementById("btn-toggle-navigator");
    if (btnNav) btnNav.addEventListener("click", toggleNavigatorMode);

    // --- 7. ADDRESS SEARCH TIMELINE GENERATOR ---
    const deskGenerateBtn = document.getElementById("desktop-btn-generate");
    const deskAddressInput = document.getElementById("desktop-address-input");
    const deskTimelineLoading = document.getElementById("desktop-timeline-loading");
    
    const mobGenerateBtn = document.getElementById("mobile-btn-generate");
    const mobAddressInput = document.getElementById("mobile-address-input");
    const mobTimelineLoading = document.getElementById("mobile-timeline-loading");

    async function runTimelineAPIRequest(address) {
        if (deskTimelineLoading) deskTimelineLoading.classList.remove("hidden");
        if (mobTimelineLoading) mobTimelineLoading.classList.remove("hidden");
        
        if (deskGenerateBtn) deskGenerateBtn.disabled = true;
        if (mobGenerateBtn) mobGenerateBtn.disabled = true;

        try {
            const response = await fetch(`${window.backendUrl}/api/diary/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: address })
            });

            if (response.ok) {
                const data = await response.json();
                updateTimelineContent(address, data.diary_feed);
            } else {
                throw new Error("API error response");
            }
        } catch (err) {
            console.warn("Backend API offline for timeline. Running local simulated generator.");
            setTimeout(() => {
                const activeZone = window.zonesData.find(z => z.zone_id === window.selectedZoneId) || window.zonesData[2];
                const sim1 = `봄바람이 부는 고향 ${address}의 구릉지에 드디어 초록빛 무성한 들풀이 무릎춤까지 차올랐습니다. 현재 루트홈 환경 측정상 식생 복구율이 무려 ${activeZone.recovery_rate}%에 달합니다.`;
                const sim2 = `어린 시절 뛰놀던 개울가에는 맑은 민물이 가득 고여 수달들의 발자국이 선명하게 목격되고 있으며, 대기 오염 점수가 무려 ${activeZone.air_quality}/100을 찍어 산들바람 속에서 투명한 풀향기가 배어 나옵니다. 옛 마당 한편에 서 있던 고목나무 그늘 아래서 따뜻한 보리차 한잔을 마실 그날이 성큼 다가왔음을 느껴 봅니다.`;
                
                const combinedDiary = `${sim1}\n\n${sim2}`;
                updateTimelineContent(address, combinedDiary);
            }, 1500);
        }
    }

    function updateTimelineContent(address, diaryContent) {
        if (deskTimelineLoading) deskTimelineLoading.classList.add("hidden");
        if (mobTimelineLoading) mobTimelineLoading.classList.add("hidden");
        
        if (deskGenerateBtn) deskGenerateBtn.disabled = false;
        if (mobGenerateBtn) mobGenerateBtn.disabled = false;

        const dBox = document.getElementById("desktop-diary-text");
        const mBox = document.getElementById("mobile-diary-text");
        const dTitle = document.getElementById("desktop-diary-zone-name");
        const mTitle = document.getElementById("mobile-diary-zone-name");

        if (dTitle) dTitle.textContent = `${address} 기후 타임라인 실시간 복구 일지`;
        if (mTitle) mTitle.textContent = `${address} 일지`;

        if (dBox) dBox.textContent = diaryContent;
        if (mBox) mBox.textContent = diaryContent;
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

    // --- 8. WARMING SIMULATOR SLIDER ---
    const warmSlider = document.getElementById("warming-degrees-slider");
    const warmValue = document.getElementById("warming-degrees-value");

    if (warmSlider) {
        warmSlider.addEventListener("input", () => {
            window.warmingDegrees = parseFloat(warmSlider.value);
            if (warmValue) warmValue.textContent = window.warmingDegrees.toFixed(1);

            // Re-render and recolor geoJSON layers
            allMunicipalityLayers.forEach(item => {
                const data = getMunicipalityData(item.code, item.name);
                const color = getStatusColor(data.status);
                item.layer.setStyle({
                    fillColor: color,
                    weight: data.isKeyZone ? 1.8 : 0.6,
                    fillOpacity: data.isKeyZone ? 0.58 : 0.32
                });
            });
        });
    }

    // --- 9. MAP LEGEND EXPAND/COLLAPSE INTERACTION ---
    const btnToggleLegend = document.getElementById("btn-toggle-legend");
    const legendContent = document.getElementById("map-legend-content");

    if (btnToggleLegend && legendContent) {
        btnToggleLegend.addEventListener("click", () => {
            const isCollapsed = legendContent.classList.toggle("collapsed");
            
            // Icon transition: change to plus if collapsed, minus if expanded
            if (isCollapsed) {
                btnToggleLegend.innerHTML = '<i data-lucide="plus" style="width: 14px; height: 14px;"></i>';
            } else {
                btnToggleLegend.innerHTML = '<i data-lucide="minus" style="width: 14px; height: 14px;"></i>';
            }
            lucide.createIcons();
        });
    }

    // --- 10. AUTHENTICATION & SESSIONS SYSTEM ---
    function initAuthSystem() {
        const deskUserBtn = document.getElementById("desktop-btn-user");
        const mobUserBtn = document.getElementById("mobile-btn-user");
        const activeSession = JSON.parse(localStorage.getItem("roothome_session"));

        const applyLoggedInUI = (email) => {
            const userShort = email.split("@")[0].toUpperCase();
            if (deskUserBtn) {
                deskUserBtn.innerHTML = `<i data-lucide="user-check"></i> <span>${userShort} 대피대원</span>`;
                deskUserBtn.style.color = "var(--color-primary)";
                deskUserBtn.style.borderColor = "var(--color-primary-light)";
            }
            if (mobUserBtn) {
                mobUserBtn.innerHTML = `<i data-lucide="user-check"></i> <span>${userShort} 대원</span>`;
            }
            lucide.createIcons();
        };

        if (activeSession && activeSession.email) {
            applyLoggedInUI(activeSession.email);
        } else {
            const defaultUser = { email: "citizen.pioneer@roothome.org" };
            localStorage.setItem("roothome_session", JSON.stringify(defaultUser));
            applyLoggedInUI(defaultUser.email);
        }
    }

    // --- 11. TAB & DEVICE NAVIGATION VIEW SYSTEM ---
    const deskTabs = document.querySelectorAll(".desktop-sidebar-nav li");
    const mobTabs = document.querySelectorAll(".mobile-nav-item");

    window.syncActiveTab = function(tabName) {
        activeTab = tabName;

        // Synchronize Desktop View Panels
        document.querySelectorAll(".tab-panel").forEach(panel => {
            panel.classList.add("hidden");
        });
        const dTarget = document.getElementById(`tab-${tabName}`);
        if (dTarget) dTarget.classList.remove("hidden");

        deskTabs.forEach(li => {
            li.classList.remove("active");
            if (li.dataset.tab === tabName) li.classList.add("active");
        });

        // Synchronize Mobile View Panels
        document.querySelectorAll(".mobile-view-panel").forEach(panel => {
            panel.classList.add("hidden");
        });
        const mTarget = document.getElementById(`mobile-tab-${tabName}`);
        if (mTarget) mTarget.classList.remove("hidden");

        mobTabs.forEach(item => {
            item.classList.remove("active");
            if (item.dataset.tab === tabName) item.classList.add("active");
        });

        // Map dimensions sync trigger on Leaflet
        if (tabName === "rootmap") {
            setTimeout(() => {
                if (desktopMap) desktopMap.invalidateSize();
                if (mobileMap) mobileMap.invalidateSize();
            }, 50);
        }
    };

    // Bind tab clicks (Desktop)
    deskTabs.forEach(li => {
        li.addEventListener("click", () => {
            const tab = li.dataset.tab;
            if (tab) window.syncActiveTab(tab);
        });
    });

    // Bind tab clicks (Mobile)
    mobTabs.forEach(item => {
        item.addEventListener("click", () => {
            const tab = item.dataset.tab;
            if (tab) window.syncActiveTab(tab);
        });
    });

    // Set Default Tab
    window.syncActiveTab("rootmap");

    // --- 12. RUNTIME SYSTEM BOOTSTRAPPER ---
    initAuthSystem();
    initDignitySystem();
    initNationalPolicyGenerator();

    // Load Live zones and trigger maps booting
    (async function bootSystem() {
        try {
            console.log("Loading real-time zones metadata from backend...");
            const response = await fetch(`${window.backendUrl}/api/zones`);
            if (response.ok) {
                const apiData = await response.json();
                window.zonesData.forEach(zone => {
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
                throw new Error("Bad API response");
            }
        } catch (err) {
            console.warn("Backend API offline or failed to fetch. Loading local mockup coordinates.");
        }

        // Initialize maps & select default zone
        initLeafletMaps();
        window.selectZone("KR-GW-03");

        // Fetch predictions and initialize sliders
        fetch50YearPredictions().then(() => {
            initTimelineDragController();
        });
    })();
});
