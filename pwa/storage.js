// ============================================================
// storage.js
// 서버 API와 통신하는 데이터 계층. 로그인 여부와 무관하게 app.js는
// 항상 loadSave/saveGame/fetchLeaderboard/submitLeaderboardEntry만
// 호출하면 되고, "지금 게스트인지 계정으로 로그인했는지"는 이 파일이
// 알아서 처리한다 (계정 모드면 요청에 인증 토큰을 실어 보낸다).
//
// 계정 관련 기능(register/login/loginWithGoogle/logout/getIdentity)은
// auth.js(로그인 화면 담당)에서만 사용한다.
// ============================================================
(function () {
  "use strict";

  const GUEST_UID_KEY = "lifegame_uid";
  const ACCOUNT_KEY = "lifegame_account"; // {uid, token, nickname}
  const LOCAL_BACKUP_KEY = "lifegame_local_backup"; // 서버 저장 실패 시 최후의 안전망

  function getGuestUid() {
    let uid = localStorage.getItem(GUEST_UID_KEY);
    if (!uid) {
      uid = "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(GUEST_UID_KEY, uid);
    }
    return uid;
  }

  function getAccount() {
    try {
      const raw = localStorage.getItem(ACCOUNT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setAccount(account) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }
  function clearAccount() {
    localStorage.removeItem(ACCOUNT_KEY);
  }

  // 지금 이 기기가 "게스트"인지 "계정으로 로그인"했는지 + 그때 쓸 uid
  function getIdentity() {
    const account = getAccount();
    if (account && account.uid && account.token) {
      return { mode: "account", uid: account.uid, token: account.token, nickname: account.nickname };
    }
    return { mode: "guest", uid: getGuestUid(), token: null, nickname: null };
  }

  function authHeaders() {
    const identity = getIdentity();
    return identity.token ? { Authorization: "Bearer " + identity.token } : {};
  }

  // ---------- 저장 ----------
  async function loadSave() {
    const identity = getIdentity();
    try {
      const res = await fetch("/api/save/" + encodeURIComponent(identity.uid), {
        headers: authHeaders(),
      });
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
    try { localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(state)); } catch (e) {}

    const identity = getIdentity();
    const res = await fetch("/api/save", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({ uid: identity.uid, nickname: state.nickname || identity.nickname || "", state }),
    });
    if (!res.ok) throw new Error("save 요청 실패: " + res.status);
  }

  // ---------- 랭킹 ----------
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
    const identity = getIdentity();
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({
        uid: identity.uid,
        nickname: entry.name,
        totalRp: entry.totalRp,
        maxFloor: entry.maxFloor,
        rebirths: entry.rebirths,
      }),
    });
    if (!res.ok) throw new Error("leaderboard 등록 실패: " + res.status);
    return fetchLeaderboard();
  }

  // ---------- 계정 (닉네임+PIN / 구글) ----------
  // 성공 시 로컬에 계정 정보를 저장한다. 화면 갱신(재로딩)은 호출한 쪽(auth.js)이 담당.
  async function register(nickname, pin, currentState) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, pin, state: currentState }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "회원가입 실패");
    setAccount({ uid: data.uid, token: data.token, nickname: data.nickname });
    return data;
  }

  async function login(nickname, pin) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "로그인 실패");
    setAccount({ uid: data.uid, token: data.token, nickname: data.nickname });
    return data;
  }

  // idToken은 Google Identity Services(client-side)에서 발급받은 ID 토큰을 그대로 넘기면 된다.
  async function loginWithGoogle(idToken, currentState) {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, state: currentState }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "구글 로그인 실패");
    setAccount({ uid: data.uid, token: data.token, nickname: data.nickname });
    return data;
  }

  async function logout() {
    const identity = getIdentity();
    if (identity.token) {
      try {
        await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
      } catch (e) {}
    }
    clearAccount();
  }

  window.GameStorage = {
    hasCloudStorage: true,
    loadSave,
    saveGame,
    fetchLeaderboard,
    submitLeaderboardEntry,
    // 계정
    getIdentity,
    register,
    login,
    loginWithGoogle,
    logout,
  };
})();
