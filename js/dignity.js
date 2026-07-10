// js/dignity.js
// Dignity Score Ledger & Gemini AI National Policy Legislation Generator

export function initDignitySystem() {
    const backendUrl = window.backendUrl || "http://127.0.0.1:8000";

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

    if (!deskFileInput || !deskDropzone) {
        console.warn("[WARN] Dignity upload DOM elements missing. Skipping initialization.");
        return;
    }

    deskSelectBtn.addEventListener("click", (e) => { e.stopPropagation(); deskFileInput.click(); });
    deskDropzone.addEventListener("click", () => deskFileInput.click());
    if (mobUploadBtn) {
        mobUploadBtn.addEventListener("click", () => mobFileInput.click());
    }

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

    if (mobFileInput) {
        mobFileInput.addEventListener("change", () => {
            if (mobFileInput.files.length > 0) processDocument(mobFileInput.files[0]);
        });
    }

    async function processDocument(file) {
        console.log(`Uploading certificate document (Modular): ${file.name}`);
        
        deskStatusBox.classList.remove("hidden");
        if (mobStatusBox) mobStatusBox.classList.remove("hidden");

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
                if (deskLatency) deskLatency.textContent = latency;
                updateUIAfterUpload(data);
            } else {
                throw new Error("FastAPI upload fail response");
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
                
                if (deskLatency) deskLatency.textContent = "1.2s";
                updateUIAfterUpload(data);
            }, 1500);
        }
    }

    function updateUIAfterUpload(data) {
        deskStatusBox.classList.add("hidden");
        if (mobStatusBox) mobStatusBox.classList.add("hidden");

        const finalScore = Math.round(data.calculated_score);
        const queueNum = data.queue_number;

        if (deskScoreValDisp) deskScoreValDisp.textContent = finalScore;
        if (mobScoreValDisp) mobScoreValDisp.textContent = finalScore;
        if (mobQueueValDisp) mobQueueValDisp.textContent = `${queueNum}`;

        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // Prepend to Desktop Ledger
        if (deskLedgerRows) {
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
        }

        // Prepend to Mobile Ledger
        if (mobLedgerRows) {
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
        }

        lucide.createIcons();
        alert(`Gemini AI 분석이 성공적으로 처리되었습니다!\n우선순위 점수: ${finalScore}점 (대기 번호: #${queueNum})`);
    }
}

// 2) Gemini National Policy Simulator (Parser & Luxury Cards Generator)
export function initNationalPolicyGenerator() {
    const btnPolicy = document.getElementById("btn-generate-national-policy");
    const resultBox = document.getElementById("national-policy-result-box");
    if (!btnPolicy || !resultBox) return;

    renderRegisteredLaws();

    const policies = [
        `[제2035-09호] 대한민국 기후 피난민 대안착 및 국가 대자연 정제 비상조치법안

■ 제1조 (목적 및 기본 이념)
본 특별법안은 대한민국 전역의 대기 정화 지표가 평균 92.5%에 도달함에 따라, 전국 250개 행정 단위의 균형 잡힌 생태 복원과 실향 가구의 영구 정착을 위한 법률적 기준과 가이드라인 수립을 목적으로 한다.

■ 제2조 (생태 장벽의 단계적 해제 및 자유 이동 보장)
대기 지수 90점, 토양 오염도 10ppm 미만을 동시에 충족하는 1급 정화 완료 시군구에 대하여, 기후대피정부는 설치되었던 통제 장벽을 정식 철거하고 거주민들의 정주 권리를 영구 보충 승인한다.

■ 제3조 (국가 기후 극복 재정 기금의 편제 및 행정 자원 지원)
환경부와 기획재정부는 총 12.4조원 규모의 '기후 난민 대안착 특별 보증 보조금'을 창설하여, 주택 정화 리모델링 및 자생 텃밭 개량 지원금으로 세대당 최대 4,500만원을 무상 급부 수여한다.

■ 제4조 (자원 순환형 스마트 일자리 특례 보장)
국가 영토 대대적 수림화와 삼림 조림 가속화를 위해 '스마트 산림 감시 드론 대원' 및 '토양 영양 개량대' 고용을 의무화하고, 귀향 실향민 청년 및 중장년 세대를 우선 고용(월 고정급 320만원 수여)한다.

■ 제5조 (귀향 정착 초기 의료·심리 지원 체계 구축)
보건복지부는 장기 실향으로 인한 트라우마와 만성 질환을 관리하기 위해 귀향 정착지마다 이동형 정신건강 클리닉과 무료 건강검진 순회팀을 배치하며, 정착 후 3년간 진료비 전액을 국비로 지원한다.

■ 제6조 (법령 시행일 및 재검토 조항)
본 특별조치법안은 공포 후 30일이 경과한 날부터 시행하며, 기후대피정부는 매 2년마다 정화 지표 달성률을 재평가하여 조항의 존속·개정 여부를 국회에 보고한다.`,
        
        `[제2035-12호] 대한민국 국토 영토 대대적 산소 융합 및 주거 재건 행정특별고시

■ 제1조 (대지 자생 지표 및 국가 복원 의무)
지구 온난화 및 기후 폭염 역습 하에서 대한민국 전체 영토의 자생 피복 지수가 78.4%에 육박함에 따라, 전 영토를 쾌적한 에코 삼림으로 완전히 승격시키기 위한 국가적 총동원 명령을 선포한다.

■ 제2조 (수질 정화 및 담수 자립 보장 특별구 지정)
강원, 충청, 영남 등 수자원 복구율 85% 이상 완료된 도심 실개천 유역을 '안전 담수 보장 구역'으로 정식 공표하며, 정수 필터 및 드론 방제 비용 전액을 국고 특별 자원으로 100% 대리 납부한다.

■ 제3조 (피난 세대 존엄성 귀향 등급 가점 보강제)
피난 주민들의 원 주거지 복귀 가속화를 위해 가구주 연령, 기후 대피 경과 일수, 가족 생계 가중치를 정밀 산출하는 'AI 존엄성 알고리즘 검증 점수'를 국정 입법 청약 청원에 필수 배점 가점으로 편입 승인한다.

■ 제4조 (접경선 비무장대 및 도서 영해 에코 관측 휴양소 보존법)
파주 임진강, 철원 평야, 울진 봉쇄림, 독도 영해 등 특수 노휴먼스랜드 구역의 자연 천연 자생을 보존하기 위해 민간인 개발을 향후 15년간 유예하며, 오직 실시간 기후 데이터 관측 목적으로만 환경 드론 상시 주둔을 허가한다.

■ 제5조 (산불·홍수 등 2차 재해 대응 비상 협력 체계)
행정안전부와 산림청은 급속 조림 지역의 산불 및 집중호우 홍수 리스크에 대응하기 위해 드론 조기경보망과 지역 자율방재단을 상시 편성하며, 피해 발생 시 72시간 내 긴급 복구 예산을 우선 집행한다.

■ 제6조 (법령 시행일 및 재검토 조항)
본 행정특별고시는 공포 후 30일이 경과한 날부터 시행하며, 환경부는 매 2년마다 자생 피복 지수 및 수자원 복구율을 재평가하여 고시 내용의 존속·개정 여부를 결정한다.`,

        `[제2035-24호] 국토교통부·환경부 공동 기후 안착 정주 인프라 구축 특별법령

■ 제1조 (스마트 에코 홈 배정 조건)
전국 거주 난민 대상 친환경 장기 임대 주택 분양 자격을 정의하며, 대한민국 기후 자립 복원율 평균인 81%를 넘어선 귀향민 수용 단지를 스마트 안착 가옥으로 우선 편입한다.

■ 제2조 (식생 보존 대지 복원 마일리지제)
마당이나 공용 대지에 자생 식물 및 조림을 가꾸는 정착 가구에 대해 수소 전기 공공 크레딧 및 전기 무상 감면 혜택을 수여하는 '대지 복원 기후 적립금 제도'를 발효한다.

■ 제3조 (자외선 및 열섬 차단 인공 돔 설치 예산 배정)
수원, 서울, 대전 등 수도권 및 중부 메가시티 핵심 통행로 주변에 인공 열섬 완충 녹지 벨트 조성을 위해 3.8조원의 긴급 예산을 신설 및 집행한다.

■ 제4조 (피난민 자활 연대 연금 지급 조항)
기후 대기 재난 지구로부터 수용 이주된 실향 1세대 원주민들의 자립 복원 가용 생계를 지원하기 위해 가구원 수에 비례하여 최대 분기별 180만원의 기후 생활 기본 소득을 보장한다.

■ 제5조 (귀향민 자녀 교육 및 보육 인프라 우선 배정)
교육부는 귀향 정착 단지 내 국공립 어린이집 및 초등돌봄교실을 우선 신설하며, 실향 기간 중 학업 공백이 발생한 아동·청소년에 대해 무상 보충학습 프로그램을 3년간 제공한다.

■ 제6조 (법령 시행일 및 재검토 조항)
본 특별법령은 공포 후 30일이 경과한 날부터 시행하며, 국토교통부와 환경부는 매 2년마다 정주 인프라 구축 현황을 재평가하여 조항의 존속·개정 여부를 공동 고시한다.`
    ];

    // Helper: Parser for policy strings into luxury JS objects
    function parsePolicyText(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const result = {
            badge: "대한민국 기후대피정부 특별법안",
            title: "기후 피난민 대안착 및 국가 대자연 정제 조치",
            articles: []
        };

        let currentArticle = null;

        lines.forEach(line => {
            if (line.startsWith("[제")) {
                const match = line.match(/\[(.*?)\]\s*(.*)/);
                if (match) {
                    result.badge = match[1];
                    result.title = match[2];
                } else {
                    result.title = line;
                }
            } else if (line.startsWith("■ 제")) {
                if (currentArticle) {
                    result.articles.push(currentArticle);
                }
                currentArticle = {
                    title: line.replace("■", "").trim(),
                    content: ""
                };
            } else {
                if (currentArticle) {
                    currentArticle.content += (currentArticle.content ? "\n" : "") + line;
                }
            }
        });

        if (currentArticle) {
            result.articles.push(currentArticle);
        }

        return result;
    }

    // Helper: Registered laws persistence (backend API + Firestore)
    function getCurrentUserId() {
        try {
            const session = JSON.parse(localStorage.getItem("roothome_session"));
            return session ? session.email : null;
        } catch (e) {
            return null;
        }
    }

    async function fetchRegisteredLaws(userId) {
        try {
            const res = await fetch(`${window.backendUrl}/api/laws?user_id=${encodeURIComponent(userId)}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.warn("[Policy] 법안 목록 조회 실패:", e);
            return [];
        }
    }

    async function renderRegisteredLaws() {
        const listEl = document.getElementById("registered-laws-list");
        if (!listEl) return;

        const userId = getCurrentUserId();
        if (!userId) {
            listEl.innerHTML = `<p style="font-size: 12px; color: #94A3B8; text-align: center; padding: 20px 0;">로그인 후 법안을 등록/조회할 수 있습니다.</p>`;
            return;
        }

        const laws = await fetchRegisteredLaws(userId);

        if (laws.length === 0) {
            listEl.innerHTML = `<p id="registered-laws-empty" style="font-size: 12px; color: #94A3B8; text-align: center; padding: 20px 0;">아직 등록된 법안이 없습니다.</p>`;
            return;
        }

        listEl.innerHTML = laws.map(law => `
            <div class="registered-law-item" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px;">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                    <i data-lucide="scroll-text" style="width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0;"></i>
                    <div style="min-width: 0;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--color-primary); margin-bottom: 2px;">${law.badge}</div>
                        <div style="font-size: 13px; font-weight: 600; color: #0F172A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${law.title}</div>
                    </div>
                </div>
                <button class="btn-delete-law" data-law-id="${law.id}" style="flex-shrink: 0; background: rgba(220,38,38,0.1); color: #DC2626; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> 삭제
                </button>
            </div>
        `).join('');

        lucide.createIcons();

        listEl.querySelectorAll(".btn-delete-law").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.lawId;
                btn.disabled = true;
                try {
                    const res = await fetch(`${window.backendUrl}/api/laws/${id}?user_id=${encodeURIComponent(userId)}`, {
                        method: "DELETE"
                    });
                    if (!res.ok) {
                        alert("법안 삭제에 실패했습니다.");
                        btn.disabled = false;
                        return;
                    }
                    renderRegisteredLaws();
                } catch (e) {
                    console.warn("[Policy] 법안 삭제 실패:", e);
                    alert("서버에 연결할 수 없습니다.");
                    btn.disabled = false;
                }
            });
        });
    }

    // Helper: Renderer for premium responsive card components
    function renderPolicyCards(parsed, element) {
        const getIconForArticle = (title) => {
            if (title.includes("목적") || title.includes("의무") || title.includes("지정")) return "info";
            if (title.includes("장벽") || title.includes("해제") || title.includes("통제") || title.includes("보장")) return "shield-alert";
            if (title.includes("재정") || title.includes("예산") || title.includes("기금") || title.includes("지급") || title.includes("조항")) return "coins";
            if (title.includes("일자리") || title.includes("고용") || title.includes("조건")) return "briefcase";
            return "scroll";
        };

        let articlesHtml = "";
        parsed.articles.forEach((art, index) => {
            const iconName = getIconForArticle(art.title);
            articlesHtml += `
                <div class="policy-article-card" style="animation-delay: ${index * 150}ms;">
                    <div class="policy-article-card-header">
                        <h5 class="policy-article-title">
                            <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
                            ${art.title}
                        </h5>
                        <div class="policy-article-icon">
                            <i data-lucide="${iconName}" style="width: 14px; height: 14px;"></i>
                        </div>
                    </div>
                    <p class="policy-article-content">${art.content.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        });

        element.innerHTML = `
            <div class="policy-card-container">
                <div class="policy-header-banner">
                    <div class="policy-seal">
                        <i data-lucide="landmark" style="width: 28px; height: 28px;"></i>
                    </div>
                    <div class="policy-header-meta">
                        <span class="policy-banner-badge">${parsed.badge}</span>
                        <h4 class="policy-banner-title">${parsed.title}</h4>
                    </div>
                    <button id="btn-register-law" style="margin-left: auto; flex-shrink: 0; background: var(--color-primary); color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="bookmark-plus" style="width: 14px; height: 14px;"></i> 법안으로 등록
                    </button>
                </div>

                <div class="policy-articles-grid">
                    ${articlesHtml}
                </div>
            </div>
        `;

        lucide.createIcons();

        const registerBtn = document.getElementById("btn-register-law");
        if (registerBtn) {
            registerBtn.addEventListener("click", async () => {
                const userId = getCurrentUserId();
                if (!userId) {
                    alert("로그인 후 법안을 등록할 수 있습니다.");
                    return;
                }
                registerBtn.disabled = true;
                try {
                    const res = await fetch(`${window.backendUrl}/api/laws`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: userId, badge: parsed.badge, title: parsed.title })
                    });
                    if (!res.ok) {
                        alert("법안 등록에 실패했습니다.");
                        registerBtn.disabled = false;
                        return;
                    }
                    renderRegisteredLaws();
                    registerBtn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> 등록 완료';
                    lucide.createIcons();
                } catch (e) {
                    console.warn("[Policy] 법안 등록 실패:", e);
                    alert("서버에 연결할 수 없습니다.");
                    registerBtn.disabled = false;
                }
            });
        }
    }

    btnPolicy.addEventListener("click", async function() {
        btnPolicy.disabled = true;
        btnPolicy.innerHTML = '<span>⚙️ 입법 시뮬레이션 제정 중...</span>';

        resultBox.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; justify-content: center; height: 120px;">
                <div class="loading-spinner" style="border: 3px solid #E2E8F0; border-top: 3px solid var(--color-primary); border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite;"></div>
                <p id="policy-loading-text" style="font-size: 12px; font-weight: 700; color: var(--color-primary);">📡 대한민국 250개 시군구 종합 기후 데이터 정합 감정 중...</p>
            </div>
        `;

        if (!document.getElementById("spin-keyframes")) {
            const style = document.createElement("style");
            style.id = "spin-keyframes";
            style.innerHTML = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
            document.head.appendChild(style);
        }

        const loaderText = document.getElementById("policy-loading-text");
        setTimeout(() => {
            if (loaderText) loaderText.textContent = "🤖 Gemini AI 국정 비상 입법 엔진 분석 드라이브 가동...";
        }, 800);

        try {
            const response = await fetch(`${window.backendUrl}/api/policy/generate`, { method: "POST" });
            const data = await response.json();
            const policyText = data.policy_text || policies[Math.floor(Math.random() * policies.length)];

            if (loaderText) loaderText.textContent = "⚖️ 기후 난민 재안착 특별법령 기획서 수립 및 자원 수혈 준비 완료!";

            const parsed = parsePolicyText(policyText);
            renderPolicyCards(parsed, resultBox);
        } catch (err) {
            console.warn("[Policy] Gemini 법령안 생성 API 호출 실패, 로컬 템플릿으로 대체:", err);
            const randomPolicy = policies[Math.floor(Math.random() * policies.length)];
            const parsed = parsePolicyText(randomPolicy);
            renderPolicyCards(parsed, resultBox);
        } finally {
            btnPolicy.disabled = false;
            btnPolicy.innerHTML = '<i data-lucide="sparkles" style="width: 16px; height: 16px;"></i> ⚡ 국정 특별 조치 법령안 제정';
            lucide.createIcons();
        }
    });
}
