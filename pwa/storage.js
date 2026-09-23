// ============================================================
// storage.js
// nginx가 서빙하는 이 페이지와 API가 같은 도메인/포트(8080)에서
// 동작하므로, 상대경로(/api/...)로 그대로 fetch하면 된다
// (CORS 설정이 필요 없다).
//
// app.js가 기대하는 인터페이스(hasCloudStorage/loadSave/saveGame/
// fetchLeaderboard/submitLeaderboardEntry)는 그대로 유지하면서
// 내부 구현만 "진짜 서버 API 호출"로 바꿨다.
// ============================================================
(function () {
  "use strict";

  const UID_KEY = "lifegame_uid";
  const LOCAL_BACKUP_KEY = "lifegame_local_backup"; // 서버 저장 실패 시 최후의 안전망

  function getUid() {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }
  const uid = getUid();

  async function loadSave() {
    try {
      const res = await fetch("/api/save/" + encodeURIComponent(uid));
      if (res.ok) {
        const row = await res.json();
        if (row && row.state_json) return JSON.parse(row.state_json);
        return null;
      }
    } catch (e) {
      // 서버에 닿지 못함 - 아래에서 로컬 백업으로 대체
    }
    try {
      const backup = localStorage.getItem(LOCAL_BACKUP_KEY);
      if (backup) return JSON.parse(backup);
    } catch (e) {}
    return null;
  }

  async function saveGame(state) {
    // 서버가 죽어 있어도 진행 상황이 사라지지 않도록 로컬에도 항상 백업해둔다.
    try { localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(state)); } catch (e) {}

    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, nickname: state.nickname || "", state }),
    });
    if (!res.ok) throw new Error("save 요청 실패: " + res.status);
  }

  function mapEntry(row) {
    return {
      name: row.nickname,
      totalRp: Number(row.total_rp),
      maxFloor: Number(row.max_floor),
      rebirths: Number(row.rebirths),
    };
  }

  async function fetchLeaderboard() {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) throw new Error("leaderboard 조회 실패: " + res.status);
    const rows = await res.json();
    return rows.map(mapEntry);
  }

  async function submitLeaderboardEntry(entry) {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        nickname: entry.name,
        totalRp: entry.totalRp,
        maxFloor: entry.maxFloor,
        rebirths: entry.rebirths,
      }),
    });
    if (!res.ok) throw new Error("leaderboard 등록 실패: " + res.status);
    return fetchLeaderboard();
  }

  window.GameStorage = {
    hasCloudStorage: true, // 이 빌드는 항상 실 서버(API)를 기준으로 동작한다
    loadSave,
    saveGame,
    fetchLeaderboard,
    submitLeaderboardEntry,
  };
})();
