/**
 * 잼잼 대근육 재활놀이 — 플레이 트래킹
 *
 * 사용법: 각 게임 HTML에 아래 한 줄 추가
 * <script src="../tracking.js" data-game="게임이름"></script>
 *
 * - trackPlay()     → 플레이 기록 + 시간 측정 시작
 * - trackComplete() → 정상 완료 표시
 *
 * 데이터는 localStorage("gemgem_tracking")에 저장 + Supabase 외부 전송
 */

(function () {
    const STORAGE_KEY = 'gemgem_tracking';
    const SITE_KEY = 'gemgem_site';
    const LOCALE_KEY = 'gemgem_lang';
    const SESSION_KEY = 'gemgem_session_id';
    const SUPABASE_URL = 'https://rwbgrdiecfkcedctnggv.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_uAWk5AgQeps9HxnkxtHXoQ_P3g5OeRP';
    const TABLE = 'game_logs';

    function getSite() {
        return localStorage.getItem(SITE_KEY) || 'hospital';
    }
    function getLocale() {
        return localStorage.getItem(LOCALE_KEY) || 'ko';
    }
    function getSessionId() {
        return localStorage.getItem(SESSION_KEY) || 'unknown';
    }

    // ── IP 위치 정보 (세션당 1회 조회, 캐시) ──
    let geoCache = null;
    let geoPromise = fetch('https://ipinfo.io/json')
        .then(r => r.json())
        .then(d => { geoCache = { country: d.country || null, city: d.city || null, ip: d.ip || null }; })
        .catch(() => { geoCache = { country: null, city: null, ip: null }; });
    function getGeo() {
        return geoPromise.then(() => geoCache || { country: null, city: null, ip: null });
    }
function getGameName() {
        const scripts = document.querySelectorAll('script[data-game]');
        for (const s of scripts) {
            if (s.getAttribute('data-game')) return s.getAttribute('data-game');
        }
        return document.title || '알수없는게임';
    }

    function sendLog(payload) {
        if (getSite() === 'local') {
            console.log('[트래킹 - local]', payload);
            return;
        }
        fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(e => console.warn('[트래킹] 로그 전송 실패', e));
    }

    function getRecords() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch (e) { return []; }
    }
    function setRecords(records) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    // ── 플레이 시간 측정 ──
    let sessionIdx = -1;
    let sessionStart = 0;
    let sessionActive = true;
    let pausedAt = 0;
    let totalPaused = 0;
    let updateTimer = null;
    let isCompleted = false;

    function getElapsedSec() {
        if (sessionStart === 0) return 0;
        const now = Date.now();
        const paused = sessionActive ? totalPaused : totalPaused + (now - pausedAt);
        return Math.round((now - sessionStart - paused) / 1000);
    }

    function saveSession() {
        if (sessionIdx < 0) return;
        const records = getRecords();
        if (records[sessionIdx]) {
            records[sessionIdx].duration = getElapsedSec();
            setRecords(records);
        }
    }

    function startTimeTracking() {
        if (updateTimer) clearInterval(updateTimer);
        sessionStart = Date.now();
        sessionActive = true;
        pausedAt = 0;
        totalPaused = 0;
        isCompleted = false;
        updateTimer = setInterval(saveSession, 5000);
    }

    // 탭 전환 시 시간 일시정지/재개
    document.addEventListener('visibilitychange', () => {
        if (sessionIdx < 0) return;
        if (document.hidden) {
            sessionActive = false;
            pausedAt = Date.now();
            saveSession();
        } else {
            if (!sessionActive && pausedAt > 0) {
                totalPaused += Date.now() - pausedAt;
            }
            sessionActive = true;
        }
    });

    // 탭 닫기 시: 시간 저장 + 미완료면 이탈 로그 전송
    window.addEventListener('beforeunload', () => {
        saveSession();
        if (sessionIdx >= 0 && !isCompleted) {
            sendLog({
                event: 'game_abandon',
                game: getGameName(),
                duration: getElapsedSec(),
                completed: false,
                session_id: getSessionId(),
                site: getSite(),
                locale: getLocale(),
                ...(geoCache || { country: null, city: null, ip: null })
            });
        }
    });

    // ── 플레이 기록 ──
    function trackPlay() {
        saveSession();

        const game = getGameName();
        const records = getRecords();
        records.push({
            game: game,
            time: new Date().toISOString(),
            duration: 0,
            completed: false
        });
        setRecords(records);
        sessionIdx = records.length - 1;
        startTimeTracking();

        getGeo().then(geo => sendLog({
            event: 'game_start',
            game: game,
            session_id: getSessionId(),
            site: getSite(),
            locale: getLocale(),
            ...geo
        }));

        console.log(`[트래킹] ${game} 플레이 기록됨`);
    }

    // ── 정상 완료 ──
    function trackComplete() {
        if (sessionIdx < 0) return;
        isCompleted = true;
        const duration = getElapsedSec();
        const records = getRecords();
        if (records[sessionIdx]) {
            records[sessionIdx].completed = true;
            records[sessionIdx].duration = duration;
            setRecords(records);
        }

        getGeo().then(geo => sendLog({
            event: 'game_end',
            game: getGameName(),
            duration: duration,
            completed: true,
            session_id: getSessionId(),
            site: getSite(),
            locale: getLocale(),
            ...geo
        }));

        console.log(`[트래킹] 게임 정상 완료`);
    }

    // 전역에 노출
    window.trackPlay = trackPlay;
    window.trackComplete = trackComplete;
})();
