// ============================================================
// auth.js
// "계정" 탭의 화면 로직만 담당한다. 실제 네트워크 호출은 storage.js의
// GameStorage.register/login/loginWithGoogle/logout/getIdentity를 그대로 쓴다.
// 로그인/회원가입 성공 후에는 location.reload()로 앱을 처음부터 다시
// 초기화시켜서, 계정의 저장 데이터를 app.js가 새로 불러오게 한다
// (가장 단순하고 실수 여지가 적은 방식).
// ============================================================
(function () {
  "use strict";

  const el = {
    statusText: document.getElementById('accountStatusText'),
    registerBox: document.getElementById('registerBox'),
    loginBox: document.getElementById('loginBox'),
    logoutBox: document.getElementById('logoutBox'),
    regNickname: document.getElementById('regNickname'),
    regPin: document.getElementById('regPin'),
    registerBtn: document.getElementById('registerBtn'),
    loginNickname: document.getElementById('loginNickname'),
    loginPin: document.getElementById('loginPin'),
    loginBtn: document.getElementById('loginBtn'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
  };

  function toast(msg) {
    if (window.showToast) window.showToast(msg);
    else alert(msg);
  }

  function currentState() {
    return window.__lifegameState || null;
  }

  function renderStatus() {
    const identity = window.GameStorage.getIdentity();
    if (identity.mode === 'account') {
      el.statusText.textContent = '👤 ' + identity.nickname + ' 님으로 로그인됨';
      el.registerBox.style.display = 'none';
      el.loginBox.style.display = 'none';
      el.logoutBox.style.display = 'block';
    } else {
      el.statusText.textContent = '게스트로 플레이 중 (이 기기에만 저장됨)';
      el.registerBox.style.display = 'block';
      el.loginBox.style.display = 'block';
      el.logoutBox.style.display = 'none';
    }
  }

  el.registerBtn.addEventListener('click', async () => {
    const nickname = (el.regNickname.value || '').trim();
    const pin = (el.regPin.value || '').trim();
    if (nickname.length < 2) { toast('⚠️ 닉네임을 2자 이상 입력해주세요'); return; }
    if (!/^\d{4,6}$/.test(pin)) { toast('⚠️ PIN은 숫자 4~6자리로 입력해주세요'); return; }

    el.registerBtn.disabled = true;
    try {
      await window.GameStorage.register(nickname, pin, currentState());
      toast('✅ 회원가입 완료! 지금 진행상황이 계정에 저장됐어요');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast('⚠️ ' + e.message);
      el.registerBtn.disabled = false;
    }
  });

  el.loginBtn.addEventListener('click', async () => {
    const nickname = (el.loginNickname.value || '').trim();
    const pin = (el.loginPin.value || '').trim();
    if (!nickname || !pin) { toast('⚠️ 닉네임과 PIN을 입력해주세요'); return; }

    el.loginBtn.disabled = true;
    try {
      await window.GameStorage.login(nickname, pin);
      toast('✅ 로그인 완료! 계정의 저장 데이터를 불러올게요');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast('⚠️ ' + e.message);
      el.loginBtn.disabled = false;
    }
  });

  el.logoutBtn.addEventListener('click', async () => {
    if (!confirm('로그아웃할까요? 이 기기는 다시 게스트 상태로 돌아갑니다.')) return;
    await window.GameStorage.logout();
    location.reload();
  });

  // ---------- 구글 로그인 (지금은 안내만, 설정 후 활성화) ----------
  // GOOGLE_CLIENT_ID를 서버 .env에 설정한 뒤, 아래 주석을 해제하고
  // index.html <head>에 다음 스크립트를 추가하면 실제로 동작한다:
  //   <script src="https://accounts.google.com/gsi/client" async defer></script>
  //
  // window.onload = () => {
  //   google.accounts.id.initialize({
  //     client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  //     callback: async (response) => {
  //       try {
  //         await window.GameStorage.loginWithGoogle(response.credential, currentState());
  //         toast('✅ 구글 로그인 완료!');
  //         setTimeout(() => location.reload(), 900);
  //       } catch (e) { toast('⚠️ ' + e.message); }
  //     },
  //   });
  //   google.accounts.id.renderButton(el.googleLoginBtn, { theme: 'outline', size: 'large' });
  // };
  el.googleLoginBtn.addEventListener('click', () => {
    toast('⚠️ 구글 로그인은 아직 서버에 설정되지 않았어요 (AUTH-SETUP.md 참고)');
  });

  renderStatus();
})();
