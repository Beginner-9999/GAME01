// ============================================================
// config.js
// 게임 밸런스 수치의 기본값과, 서버(Node API + MariaDB의
// game_config 테이블)로부터 값을 덮어쓰는 로직을 담당한다.
//
// CONFIG_URL은 nginx가 프록시하는 /api/config 를 가리킨다.
// 서버가 응답하지 않으면(오프라인 등) 마지막으로 받았던 값
// (localStorage 캐시) → 그것도 없으면 DEFAULT_CONFIG 순으로
// 안전하게 대체된다.
// ============================================================
(function () {
  "use strict";

  const CONFIG_URL = "/api/config"; // 실제 서버(Node API)에서 밸런스 설정을 읽어온다
  const CONFIG_CACHE_KEY = "lifegame_config_cache";

  // 여기 있는 값들이 "서버에서 조정 가능한 설정"이다.
  // 2026-10-13 기획서 업데이트: 난이도 10단계 × 인생단계 5개 × 스테이지 40개
  // 구조로 전환하면서 선형 성장(hpGrowthRate 등)을 복리 성장 공식으로 교체했다.
  const DEFAULT_CONFIG = {
    // 스테이지 구조
    stagesPerLifeStage: 40,  // 난이도 1개 안에서 인생 단계 1개당 스테이지 수 (기존 tierLength 대체)

    // 몬스터 기준치 (난이도 Beginner · 인생단계 1번째 · 스테이지 1 기준, 일반 등급)
    hpBase: 120,
    atkBase: 10,

    // 스테이지가 1 올라갈 때마다 곱해지는 복리 성장률
    stageHpGrowth: 1.02,     // HP +2%/스테이지
    stageAtkGrowth: 1.015,   // 공격력 +1.5%/스테이지

    // 난이도가 하나 올라갈 때, "이전 난이도 마지막(40) 스테이지" 대비 추가로 곱하는 배율
    difficultyJumpBonus: 1.20, // 즉 다음 난이도 1스테이지가 이전 난이도 40스테이지보다 약 20% 강함

    // 몬스터 등급 배율
    bossHpMult: 6, bossAtkMult: 2,
    eliteHpMult: 3, eliteAtkMult: 1.5, // 정예 등급은 아직 콘텐츠에 없음(추후 확장 대비)

    // 재화/보상 관련 (스테이지·난이도 둘 다 복리로 증가)
    goldBase: 5,
    goldStageGrowth: 1.04,       // 골드 +4%/스테이지
    goldDifficultyGrowth: 1.30,  // 골드 ×1.30/난이도
    dropStageGrowth: 1.02,       // 드랍률 +2%/스테이지 (드랍 시스템 추가 시 사용)
    dropDifficultyGrowth: 1.20,  // 드랍률 ×1.20/난이도
    goldMultiplier: 1,           // 전체 골드 획득 배율 (이벤트 시 서버에서 올릴 수 있음)

    // 환생 관련
    rpGainDivisor: 3,       // RP 계산식의 나눗값 (작을수록 RP를 많이 줌)
    rpGainExponent: 1.4,    // RP 계산식의 지수 (클수록 후반 스테이지 보상이 커짐)

    // 전투 템포
    spawnDelayBase: 800,    // 몬스터 처치 후 다음 몬스터 등장까지 기본 대기시간(ms)
    stageTimeLimitMs: 10000, // 몬스터 등장 후 이 시간(ms) 안에 못 잡으면 이전 스테이지로 후퇴

    // 자동 공격(유료 상품) 관련
    autoAttackPerLevel: 0.4, // 자동 공격 시스템 레벨당 초당 공격 횟수
  };

  async function loadGameConfig() {
    let cfg = Object.assign({}, DEFAULT_CONFIG);
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-store" });
      if (res.ok) {
        const remote = await res.json();
        cfg = Object.assign(cfg, remote);
        try { localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg)); } catch (e) {}
        cfg.__source = "server";
        return cfg;
      }
    } catch (e) {
      // 오프라인이거나 API 서버가 응답하지 않는 환경
    }
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      if (cached) {
        cfg = Object.assign(cfg, JSON.parse(cached));
        cfg.__source = "cache";
        return cfg;
      }
    } catch (e) {}
    cfg.__source = "default";
    return cfg;
  }

  window.DEFAULT_CONFIG = DEFAULT_CONFIG;
  window.loadGameConfig = loadGameConfig;
})();
