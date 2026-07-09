/* -------------------------------------------------------------
 * RootHome National Climate Risk Portal (app.js - Modular Coordinator)
 * Coordinates and bootstraps specialized JS modules.
 * ------------------------------------------------------------- */

import { mockZones, zoneDiaries, zoneFutureTimelines } from './js/data.js?v=20260710-3';
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
} from './js/map.js?v=20260710-3';
import { initDignitySystem, initNationalPolicyGenerator } from './js/dignity.js?v=20260710-3';

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
        const btnLabel = btn ? btn.querySelector("span") : null;
        const panel = document.getElementById("desktop-navigator-status-panel");
        if (!btn || !panel) return;

        const isActivating = !btn.classList.contains("active");
        setNavigatorModeActive(isActivating);

        if (isActivating) {
            window.syncActiveTab("rootmap", "desktop");
            btn.classList.add("active");
            if (btnLabel) btnLabel.textContent = "내비게이터 종료";
            panel.classList.remove("hidden");
            window.setNavStatusText("지도를 클릭해 출발지를 선택하세요.");
        } else {
            btn.classList.remove("active");
            if (btnLabel) btnLabel.textContent = "기후피난 안전경로 찾기";
            panel.classList.add("hidden");
            resetNavigator();
        }
    }

    const btnNav = document.getElementById("btn-toggle-navigator");
    if (btnNav) {
        btnNav.addEventListener("click", (e) => {
            e.preventDefault();
            toggleNavigatorMode();
        });
    }

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

            // Re-render and recolor geoJSON layers correctly using Leaflet's eachLayer API
            allMunicipalityLayers.forEach(geoJsonLayer => {
                if (typeof geoJsonLayer.eachLayer === "function") {
                    geoJsonLayer.eachLayer(layer => {
                        const feat = layer.feature;
                        if (feat && feat.properties) {
                            const data = getMunicipalityData(feat.properties.code, feat.properties.name);
                            const color = getStatusColor(data.status);
                            layer.setStyle({
                                fillColor: color,
                                weight: data.isKeyZone ? 1.8 : 0.6,
                                fillOpacity: data.isKeyZone ? 0.58 : 0.32
                            });
                        }
                    });
                }
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

    // --- 10. PREMIUM GLASSMORPHISM AUTHENTICATION & SETTINGS SYSTEM ---
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

        const settingsName = document.getElementById("settings-name");
        const settingsEmail = document.getElementById("settings-email");
        const settingsPasswordCurrent = document.getElementById("settings-password-current");
        const settingsPassword = document.getElementById("settings-password");
        const settingsPasswordConfirm = document.getElementById("settings-password-confirm");
        const settingsPasswordFields = document.getElementById("settings-password-fields");
        const btnSettingsChangePassword = document.getElementById("btn-settings-change-password");
        const btnSettingsPasswordText = document.getElementById("btn-settings-password-text");
        const btnSettingsPasswordSubmit = document.getElementById("btn-settings-password-submit");

        const themeLightBtn = document.getElementById("theme-light-btn");
        const themeDarkBtn = document.getElementById("theme-dark-btn");
        let selectedTheme = localStorage.getItem("roothome_theme") || "light";

        // Initialize Theme from localStorage on Startup
        if (selectedTheme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }

        function openSettings() {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            let nameVal = "";
            let emailVal = "";
            let hometownVal = "";
            let residenceVal = "";

            // Hide password fields and reset on fresh modal open
            if (settingsPasswordFields) settingsPasswordFields.classList.add("hidden");
            if (settingsPasswordCurrent) settingsPasswordCurrent.value = "";
            if (settingsPassword) settingsPassword.value = "";
            if (settingsPasswordConfirm) settingsPasswordConfirm.value = "";

            if (session) {
                const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                const user = users.find(u => u.email === session.email);
                if (user) {
                    nameVal = user.name || "";
                    emailVal = user.email || "";
                    hometownVal = user.hometown || "";
                    residenceVal = user.residence || "";
                }
                
                if (settingsName) { settingsName.value = nameVal; settingsName.disabled = false; settingsName.placeholder = "이름을 입력하세요"; }
                if (settingsEmail) { settingsEmail.value = emailVal; settingsEmail.disabled = false; settingsEmail.placeholder = "이메일을 입력하세요"; }
                
                if (btnSettingsChangePassword) {
                    btnSettingsChangePassword.disabled = false;
                    btnSettingsChangePassword.style.opacity = "1";
                    btnSettingsChangePassword.style.cursor = "pointer";
                }
                if (btnSettingsPasswordText) btnSettingsPasswordText.textContent = "비밀번호 변경하기";
            } else {
                const guestSettings = JSON.parse(localStorage.getItem("roothome_guest_settings")) || {};
                hometownVal = guestSettings.hometown || "";
                residenceVal = guestSettings.residence || "";
                
                if (settingsName) { settingsName.value = ""; settingsName.disabled = true; settingsName.placeholder = "로그인 시 활성화됩니다"; }
                if (settingsEmail) { settingsEmail.value = ""; settingsEmail.disabled = true; settingsEmail.placeholder = "로그인 시 활성화됩니다"; }
                
                if (btnSettingsChangePassword) {
                    btnSettingsChangePassword.disabled = true;
                    btnSettingsChangePassword.style.opacity = "0.5";
                    btnSettingsChangePassword.style.cursor = "not-allowed";
                }
                if (btnSettingsPasswordText) btnSettingsPasswordText.textContent = "로그인 시 변경 가능";
            }

            if (settingsHometown) settingsHometown.value = hometownVal;
            if (settingsResidence) settingsResidence.value = residenceVal;

            // Sync theme button active states with current theme in body
            const isDark = document.body.classList.contains("dark-theme");
            if (isDark) {
                if (themeDarkBtn) themeDarkBtn.classList.add("active");
                if (themeLightBtn) themeLightBtn.classList.remove("active");
                selectedTheme = "dark";
            } else {
                if (themeLightBtn) themeLightBtn.classList.add("active");
                if (themeDarkBtn) themeDarkBtn.classList.remove("active");
                selectedTheme = "light";
            }

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

        const headerSettingsBtn = document.getElementById("header-settings-btn");
        if (headerSettingsBtn) {
            headerSettingsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openSettings();
            });
        }

        const mobSettingsRowHometown = document.getElementById("mobile-settings-row-hometown");
        if (mobSettingsRowHometown) {
            mobSettingsRowHometown.addEventListener("click", (e) => {
                e.preventDefault();
                openSettings();
            });
        }

        // Secure password expand-on-click trigger
        if (btnSettingsChangePassword) {
            btnSettingsChangePassword.addEventListener("click", () => {
                const session = JSON.parse(localStorage.getItem("roothome_session"));
                if (!session) return; // ignore guest clicks

                const isHidden = settingsPasswordFields.classList.contains("hidden");
                if (isHidden) {
                    settingsPasswordFields.classList.remove("hidden");
                    if (btnSettingsPasswordText) btnSettingsPasswordText.textContent = "변경 취소하기";
                } else {
                    settingsPasswordFields.classList.add("hidden");
                    if (btnSettingsPasswordText) btnSettingsPasswordText.textContent = "비밀번호 변경하기";
                    if (settingsPasswordCurrent) settingsPasswordCurrent.value = "";
                    if (settingsPassword) settingsPassword.value = "";
                    if (settingsPasswordConfirm) settingsPasswordConfirm.value = "";
                }
            });
        }

        // Real-time Live Theme Preview Toggles
        if (themeLightBtn) {
            themeLightBtn.addEventListener("click", () => {
                if (themeLightBtn) themeLightBtn.classList.add("active");
                if (themeDarkBtn) themeDarkBtn.classList.remove("active");
                document.body.classList.remove("dark-theme");
                selectedTheme = "light";
            });
        }

        if (themeDarkBtn) {
            themeDarkBtn.addEventListener("click", () => {
                if (themeDarkBtn) themeDarkBtn.classList.add("active");
                if (themeLightBtn) themeLightBtn.classList.remove("active");
                document.body.classList.add("dark-theme");
                selectedTheme = "dark";
            });
        }

        // Secure separate Password Submit click event
        if (btnSettingsPasswordSubmit) {
            btnSettingsPasswordSubmit.addEventListener("click", () => {
                const session = JSON.parse(localStorage.getItem("roothome_session"));
                if (!session) return; // ignore guest clicks

                const currentVal = settingsPasswordCurrent.value;
                const passVal = settingsPassword.value;
                const confVal = settingsPasswordConfirm.value;

                if (!currentVal || !passVal || !confVal) {
                    alert("현재 비밀번호, 새 비밀번호, 확인 입력창을 모두 채워주세요.");
                    return;
                }

                // Verify typed current password matches account password in DB
                const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                const userIndex = users.findIndex(u => u.email === session.email);
                if (userIndex === -1 || users[userIndex].password !== currentVal) {
                    alert("입력하신 현재 비밀번호가 일치하지 않습니다.");
                    return;
                }

                if (passVal !== confVal) {
                    alert("입력하신 새 비밀번호가 일치하지 않습니다. 다시 입력해 주세요.");
                    return;
                }

                if (passVal.length < 6) {
                    alert("비밀번호는 최소 6자리 이상이어야 합니다.");
                    return;
                }

                // Update Database entry
                users[userIndex].password = passVal;
                localStorage.setItem("roothome_users", JSON.stringify(users));

                // Clean fields and fold drawer
                if (settingsPasswordCurrent) settingsPasswordCurrent.value = "";
                if (settingsPassword) settingsPassword.value = "";
                if (settingsPasswordConfirm) settingsPasswordConfirm.value = "";
                if (settingsPasswordFields) settingsPasswordFields.classList.add("hidden");
                if (btnSettingsPasswordText) btnSettingsPasswordText.textContent = "비밀번호 변경하기";

                alert("비밀번호가 성공적으로 변경되었습니다!");
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
                    const name = settingsName.value.trim();
                    const email = settingsEmail.value.trim();

                    if (!name || !email) {
                        alert("이름과 이메일은 필수 입력 사항입니다.");
                        return;
                    }

                    const users = JSON.parse(localStorage.getItem("roothome_users")) || [];
                    
                    // Check if new email is already taken by someone else
                    const emailExists = users.some(u => u.email === email && u.email !== session.email);
                    if (emailExists) {
                        alert("이미 등록된 다른 사용자의 이메일 주소입니다.");
                        return;
                    }

                    // Find index using session email (the original identifier)
                    const userIndex = users.findIndex(u => u.email === session.email);
                    if (userIndex !== -1) {
                        // Update Database entry
                        users[userIndex].name = name;
                        users[userIndex].email = email;
                        users[userIndex].hometown = hometown;
                        users[userIndex].residence = residence;
                        localStorage.setItem("roothome_users", JSON.stringify(users));

                        // Sync Active Session info
                        session.name = name;
                        session.email = email;
                        localStorage.setItem("roothome_session", JSON.stringify(session));
                    }
                } else {
                    const guestSettings = { hometown, residence };
                    localStorage.setItem("roothome_guest_settings", JSON.stringify(guestSettings));
                }

                // Persist theme selection
                localStorage.setItem("roothome_theme", selectedTheme);

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

    // --- 11. TAB & DEVICE NAVIGATION VIEW SYSTEM ---
    const deskTabs = document.querySelectorAll(".sidebar-menu .menu-item");
    const mobTabs = document.querySelectorAll(".mobile-nav-item");

    // 데스크톱 탭 이름(rootmap/timeline)과 모바일 탭 이름(home/timeline/profile)이 서로 달라
    // 두 방향 매핑이 필요하다.
    const deskToMobTab = { rootmap: "home", timeline: "timeline" };
    const mobToDeskTab = { home: "rootmap", timeline: "timeline", profile: "timeline" };

    window.syncActiveTab = function(tabName, source) {
        const deskTab = source === "mobile" ? (mobToDeskTab[tabName] || tabName) : tabName;
        const mobTab = source === "mobile" ? tabName : (deskToMobTab[deskTab] || deskTab);
        activeTab = deskTab;

        // Synchronize Desktop View Panels
        document.querySelectorAll(".tab-content").forEach(panel => {
            panel.classList.add("hidden");
            panel.classList.remove("active");
        });
        const dTarget = document.getElementById(`tab-${deskTab}`);
        if (dTarget) { dTarget.classList.remove("hidden"); dTarget.classList.add("active"); }

        deskTabs.forEach(item => {
            if (!item.dataset.tab) return; // 안전경로 버튼처럼 탭이 아닌 메뉴 항목은 건드리지 않는다.
            item.classList.remove("active");
            if (item.dataset.tab === deskTab) item.classList.add("active");
        });

        // Synchronize Mobile View Panels
        document.querySelectorAll(".mobile-tab-content").forEach(panel => {
            panel.classList.add("hidden");
            panel.classList.remove("active");
        });
        const mTarget = document.getElementById(`mobtab-${mobTab}`);
        if (mTarget) { mTarget.classList.remove("hidden"); mTarget.classList.add("active"); }

        mobTabs.forEach(item => {
            item.classList.remove("active");
            if (item.dataset.mobtab === mobTab) item.classList.add("active");
        });

        // Auto-scroll timeline to 2026 card
        if (deskTab === "timeline" || mobTab === "timeline") {
            setTimeout(() => {
                const dFlow = document.getElementById("desktop-timeline-flow");
                const dCard = document.getElementById("desktop-timeline-card-2026");
                if (dFlow && dCard) {
                    dFlow.scrollTop = dCard.offsetTop - 12; // subtract 12px padding for beautiful alignment
                }
                const mFlow = document.getElementById("mobile-timeline-flow");
                const mCard = document.getElementById("mobile-timeline-card-2026");
                if (mFlow && mCard) {
                    mFlow.scrollTop = mCard.offsetTop - 8; // subtract 8px padding for beautiful alignment
                }
            }, 100);
        }

        // Map dimensions sync trigger on Leaflet
        if (deskTab === "rootmap") {
            setTimeout(() => {
                if (desktopMap) desktopMap.invalidateSize();
                if (mobileMap) mobileMap.invalidateSize();
            }, 50);
        }
    };

    // Bind tab clicks (Desktop)
    deskTabs.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            if (tab) window.syncActiveTab(tab, "desktop");
        });
    });

    // Bind tab clicks (Mobile)
    mobTabs.forEach(item => {
        item.addEventListener("click", () => {
            const tab = item.dataset.mobtab;
            if (tab) window.syncActiveTab(tab, "mobile");
        });
    });

    // --- 11-B. SUBTAB VIEW TRANSITION CONTROLLER (RootMap Subtabs) ---
    function initRootMapSubtabs() {
        const subtabButtons = document.querySelectorAll("#header-nav-rootmap .nav-tab");
        const subtabContents = document.querySelectorAll(".subtab-content");
        const subtabIds = ["subtab-realtime", "subtab-prediction", "subtab-policy"];

        subtabButtons.forEach((btn, idx) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                
                // Active button class transition
                subtabButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                // Tab panel hidden/active class transition
                subtabContents.forEach(panel => {
                    panel.classList.add("hidden");
                    panel.classList.remove("active");
                });

                const targetId = subtabIds[idx];
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.classList.remove("hidden");
                    targetPanel.classList.add("active");
                }

                // If switching back to realtime map, force Leaflet to resize correctly
                if (targetId === "subtab-realtime") {
                    setTimeout(() => {
                        if (desktopMap) desktopMap.invalidateSize();
                        if (mobileMap) mobileMap.invalidateSize();
                    }, 50);
                }
            });
        });
    }

    // Set Default Tab
    window.syncActiveTab("rootmap", "desktop");

    // --- 11.5 HEADER SUBTABS BINDINGS (실시간 환경 / 예측 분석 / 정책 리소스) ---
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

    // --- 12. RUNTIME SYSTEM BOOTSTRAPPER ---
    initAuthSystem();
    initRootMapSubtabs();
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
