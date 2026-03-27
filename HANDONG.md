# 한동대 (handong) 커스텀 작업 내역

접속 URL: `https://playyayho.com/?site=handong`

---

## 변경 파일 목록

### tracking.js
- `window.getSite = getSite` 추가 → 모든 게임에서 `getSite()` 전역 사용 가능

### index.html (메인)
- `c02-hs` site 추가 (handong 작업 중 같이 추가됨)

---

## 게임별 커스텀

### 풍선팡팡 (balloon_pang)
| 항목 | 내용 |
|------|------|
| 피버타임 비활성화 | `startFever()` 진입 시 handong이면 즉시 return |
| 무지개 테두리 제거 | 피버타임 자체가 없으므로 자연히 제거됨 |
| 꽃가루 이펙트 제거 | 피버타임 자체가 없으므로 자연히 제거됨 |
| 게이지 시간 기반 변경 | 풍선 팝 기준 → 60초 게임 시간에 비례해서 자동으로 차오름 |

### 뿡뿡이 (pung)
| 항목 | 내용 |
|------|------|
| 피버타임 시작 시 똥 발사 제거 | `launchPoop()` 호출 skip |
| 피버타임 중 똥 분수 제거 | `spawnPoopFountain()` 내 PhysicsPoop, Confetti 생성 skip |
| 방귀 연기 이펙트 유지 | GasPuff, GasDot, GasWave는 그대로 나옴 |
| 방귀 텍스트 지속 시간 2배 | 기존 ~1.3초 → ~2.6초 (lifeDecay 0.026 → 0.013) |

### 얼음깨기 (ice_breaker)
| 항목 | 내용 |
|------|------|
| 화면 흰색 점멸 효과 제거 | `flashAlpha` 조건에 `getSite() !== 'handong'` 추가 |

---

## 공통 추가 (전체 사이트)

| 항목 | 내용 |
|------|------|
| 나가기 버튼 | 4개 게임(풍선팡팡, 뿡뿡이, 얼음깨기, 두더지) 좌상단에 추가 |
| 동작 | `window.close()` → 탭 닫힘, 이탈 로그(`game_abandon`) 자동 전송 |

---

## 향후 작업 예정

| 항목 | 상태 |
|------|------|
| 튜토리얼 음성 안내 추가 | 녹음 파일 준비 중 |

### 음성 파일 목록 (준비 완료 시 각 게임 폴더에 저장)
| 파일명 | 문구 | 게임 |
|--------|------|------|
| `balloon_tut_1.wav` | 손으로 풍선을 터뜨려봐! | balloon_pang/ |
| `balloon_tut_2.wav` | 손이 풍선에 닿으면 풍선이 터져! | balloon_pang/ |
| `pung_tut_1.wav` | 자리에서 앉아봐! | pung/ |
| `pung_tut_2.wav` | 으하하! 앉으면 방귀가 뿡~! | pung/ |
| `ice_tut_1.wav` | 손을 뻗어서 얼음을 부숴봐! | ice_breaker/ |
| `ice_tut_2.wav` | 손이 닿으면 얼음이 쾅! | ice_breaker/ |
