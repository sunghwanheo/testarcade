/**
 * 잼잼 대근육 재활놀이 — 플레이 트래킹
 *
 * 사용법: 각 게임 HTML에 아래 한 줄 추가
 * <script src="/testarcade/tracking.js" data-game="게임이름"></script>
 *
 * 자동으로:
 * - 게임 페이지 열릴 때 1회 기록
 * - trackPlay() 호출 시 추가 기록 (게임 내 "다시하기" 버튼에 연결)
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

    // 기록 불러오기
    function getRecords() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    // 기록 저장
    function saveRecord(tester, game) {
        const records = getRecords();
        records.push({
            tester: tester,
            game: game,
            time: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    // 플레이 기록 함수 (게임에서 직접 호출 가능)
    function trackPlay() {
        const tester = getCurrentTester();
        const game = getGameName();
        saveRecord(tester, game);
        console.log(`[트래킹] ${tester} → ${game} 플레이 기록됨`);
    }

    // 전역에 노출
    window.trackPlay = trackPlay;

    // 페이지 로드 시 자동 1회 기록
    trackPlay();
})();
