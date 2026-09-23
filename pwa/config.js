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
  const DEFAULT_CONFIG = {
    // 스테이지(층) 관련
    tierLength: 10,        // 인생 단계 1개당 층 수 (총 층수 = tierLength * 단계 수)
    hpBase: 10,             // 1층 몬스터 기본 체력
    hpGrowthRate: 1.13,     // 층당 몬스터 체력 성장 배율 (난이도)

    // 재화 관련
    goldBase: 5,            // 몬스터 처치 시 기본 골드
    goldPerFloor: 2,        // 층수에 비례한 추가 골드
    goldMultiplier: 1,      // 전체 골드 획득 배율 (이벤트 시 서버에서 올릴 수 있음)

    // 환생 관련
    rpGainDivisor: 3,       // RP 계산식의 나눗값 (작을수록 RP를 많이 줌)
    rpGainExponent: 1.4,    // RP 계산식의 지수 (클수록 후반 층수 보상이 커짐)

    // 전투 템포
    spawnDelayBase: 800,    // 몬스터 처치 후 다음 몬스터 등장까지 기본 대기시간(ms)

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
