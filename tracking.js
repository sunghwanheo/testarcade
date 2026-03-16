/**
 * 잼잼 대근육 재활놀이 — 플레이 트래킹
 *
 * 사용법: 각 게임 HTML에 아래 한 줄 추가
 * <script src="../tracking.js" data-game="게임이름"></script>
 *
 * - trackPlay() 호출 시 플레이 기록 + 플레이 시간 측정 시작
 * - 탭 나가기/닫기 시에도 플레이 시간 자동 저장
 *
 * 데이터는 localStorage("gemgem_tracking")에 저장
 */

(function () {
    const STORAGE_KEY = 'gemgem_tracking';
    const TESTER_KEY = 'gemgem_current_tester';

    // 현재 테스터
    function getCurrentTester() {
        return localStorage.getItem(TESTER_KEY) || '미지정';
    }

    // 게임 이름 (script 태그의 data-game 속성에서)
    function getGameName() {
        const scripts = document.querySelectorAll('script[data-game]');
        for (const s of scripts) {
            if (s.getAttribute('data-game')) return s.getAttribute('data-game');
        }
        return document.title || '알수없는게임';
    }

    // 기록 불러오기/저장
    function getRecords() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch (e) { return []; }
    }
    function setRecords(records) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    // ── 플레이 시간 측정 ──
    let sessionIdx = -1;       // 현재 세션의 records 인덱스
    let sessionStart = 0;      // 시작 시각 (ms)
    let sessionActive = true;  // 탭 활성 여부
    let pausedAt = 0;          // 비활성 시작 시각
    let totalPaused = 0;       // 총 비활성 시간 (ms)
    let updateTimer = null;

    function getElapsedSec() {
        const now = Date.now();
        const paused = sessionActive ? totalPaused : totalPaused + (now - pausedAt);
        return Math.round((now - sessionStart - paused) / 1000);
    }

    function saveDuration() {
        if (sessionIdx < 0) return;
        const records = getRecords();
        if (records[sessionIdx]) {
            records[sessionIdx].duration = getElapsedSec();
            setRecords(records);
        }
    }

    function startTimeTracking() {
        // 이전 타이머 정리
        if (updateTimer) clearInterval(updateTimer);

        sessionStart = Date.now();
        sessionActive = true;
        pausedAt = 0;
        totalPaused = 0;

        // 5초마다 경과 시간 저장
        updateTimer = setInterval(saveDuration, 5000);
    }

    // 탭 전환 감지
    document.addEventListener('visibilitychange', () => {
        if (sessionIdx < 0) return;
        if (document.hidden) {
            sessionActive = false;
            pausedAt = Date.now();
            saveDuration();
        } else {
            if (!sessionActive && pausedAt > 0) {
                totalPaused += Date.now() - pausedAt;
            }
            sessionActive = true;
        }
    });

    // 탭 닫기/이동 시 저장
    window.addEventListener('beforeunload', saveDuration);

    // ── 플레이 기록 ──
    function trackPlay() {
        // 이전 세션 마무리
        saveDuration();

        const tester = getCurrentTester();
        const game = getGameName();
        const records = getRecords();
        records.push({
            tester: tester,
            game: game,
            time: new Date().toISOString(),
            duration: 0
        });
        setRecords(records);
        sessionIdx = records.length - 1;
        startTimeTracking();
        console.log(`[트래킹] ${tester} → ${game} 플레이 기록됨`);
    }

    // 전역에 노출
    window.trackPlay = trackPlay;
})();
