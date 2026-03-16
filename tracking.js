/**
 * 잼잼 대근육 재활놀이 — 플레이 트래킹
 *
 * 사용법: 각 게임 HTML에 아래 한 줄 추가
 * <script src="../tracking.js" data-game="게임이름"></script>
 *
 * - trackPlay()     → 플레이 기록 + 시간 측정 시작
 * - trackComplete() → 정상 완료 표시
 *
 * 데이터는 localStorage("gemgem_tracking")에 저장
 */

(function () {
    const STORAGE_KEY = 'gemgem_tracking';
    const TESTER_KEY = 'gemgem_current_tester';

    function getCurrentTester() {
        return localStorage.getItem(TESTER_KEY) || '미지정';
    }

    function getGameName() {
        const scripts = document.querySelectorAll('script[data-game]');
        for (const s of scripts) {
            if (s.getAttribute('data-game')) return s.getAttribute('data-game');
        }
        return document.title || '알수없는게임';
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

    // 탭 닫기 시 시간 저장
    window.addEventListener('beforeunload', saveSession);

    // ── 플레이 기록 ──
    function trackPlay() {
        saveSession();

        const tester = getCurrentTester();
        const game = getGameName();
        const records = getRecords();
        records.push({
            tester: tester,
            game: game,
            time: new Date().toISOString(),
            duration: 0,
            completed: false
        });
        setRecords(records);
        sessionIdx = records.length - 1;
        startTimeTracking();
        console.log(`[트래킹] ${tester} → ${game} 플레이 기록됨`);
    }

    // ── 정상 완료 ──
    function trackComplete() {
        if (sessionIdx < 0) return;
        const records = getRecords();
        if (records[sessionIdx]) {
            records[sessionIdx].completed = true;
            records[sessionIdx].duration = getElapsedSec();
            setRecords(records);
        }
        console.log(`[트래킹] 게임 정상 완료`);
    }

    // 전역에 노출
    window.trackPlay = trackPlay;
    window.trackComplete = trackComplete;
})();
