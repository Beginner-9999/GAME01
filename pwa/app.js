// ============================================================
// app.js
// 게임 상태/렌더링/루프. config.js(밸런스), data.js(콘텐츠),
// storage.js(저장/랭킹)를 조합해서 실제로 화면을 그리고 동작시킨다.
// ============================================================
(function () {
  "use strict";

  const { TIERS, DIFFICULTIES, GOLD_UPGRADES, PET_DEFS, RP_UPGRADES } = window.GAME_DATA;
  let cfg = window.DEFAULT_CONFIG; // loadGameConfig() 완료 전 임시 기본값

  // ---------- 상태 ----------
  let state = {
    floor: 0, monsterHp: 0, monsterMaxHp: 0,
    gold: 0, rp: 0, totalRpEarned: 0, rebirths: 0, maxFloorEver: 0, nickname: '',
    goldUpg: { atk: 0, autoAttack: 0, atkspeed: 0, movespeed: 0, crit: 0, critdmg: 0 },
    pets: { dog: 0, cat: 0, owl: 0, dragon: 0 },
    rpUpg: { ratk: 0, ratkspeed: 0, rmove: 0, rcrit: 0, rcritdmg: 0, rpBoost: 0 },
  };
  let isDead = false;
  let atkAccumulator = 0;
  let lastTick = performance.now();
  window.__lifegameState = state; // auth.js가 회원가입 시 현재 진행 상황을 같이 올리기 위해 참조

  // ---------- 유틸 ----------
  function costFor(base, mult, level) { return Math.ceil(base * Math.pow(mult, level)); }
  function formatNum(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
    let u = -1, v = n;
    while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
    return v.toFixed(v < 10 ? 2 : (v < 100 ? 1 : 0)) + units[u];
  }
  // ---------- 난이도 × 인생단계 × 스테이지 진행 구조 ----------
  // floor는 0부터 시작하는 절대 스테이지 번호. 난이도 하나당
  // (인생단계 5개 × stagesPerLifeStage)만큼의 floor를 차지한다.
  function totalStagesPerDifficulty() { return TIERS.length * cfg.stagesPerLifeStage; }
  function getDifficultyIndex(floor) {
    return Math.min(Math.floor(floor / totalStagesPerDifficulty()), DIFFICULTIES.length - 1);
  }
  function getTierIndex(floor) {
    return Math.floor((floor % totalStagesPerDifficulty()) / cfg.stagesPerLifeStage);
  }
  function getStageInTier(floor) { return floor % cfg.stagesPerLifeStage; } // 0 ~ stagesPerLifeStage-1

  // tier.monsters(보스 포함)를 stagesPerLifeStage칸짜리 스케줄로 바꾼다.
  // 보스가 여러 마리인 구간(성인: 대학·취업 던전 / 회사 프로젝트 던전)은
  // 구간 수만큼 균등하게 나눠서 각 구간 마지막 칸에 보스를 배치한다.
  const _scheduleCache = new Map();
  function getStageSchedule(tier) {
    if (_scheduleCache.has(tier)) return _scheduleCache.get(tier);

    const segments = [];
    let seg = [];
    tier.monsters.forEach((m) => {
      seg.push(m);
      if (m.grade === 'boss') { segments.push(seg); seg = []; }
    });
    if (seg.length) segments.push(seg); // 보스 없이 끝나는 경우를 위한 안전장치

    const schedule = [];
    const segLen = Math.floor(cfg.stagesPerLifeStage / segments.length);
    segments.forEach((segment, i) => {
      const normals = segment.filter((m) => m.grade !== 'boss');
      const boss = segment.find((m) => m.grade === 'boss');
      const len = (i === segments.length - 1) ? cfg.stagesPerLifeStage - schedule.length : segLen;
      for (let s = 0; s < len; s++) {
        schedule.push((s === len - 1 && boss) ? boss : normals[s % normals.length]);
      }
    });

    _scheduleCache.set(tier, schedule);
    return schedule;
  }
  function getMonster(floor) {
    const tier = TIERS[getTierIndex(floor)];
    return getStageSchedule(tier)[getStageInTier(floor)];
  }
  function gradeMult(m) {
    if (m.grade === 'boss') return { hp: cfg.bossHpMult, atk: cfg.bossAtkMult };
    if (m.grade === 'elite') return { hp: cfg.eliteHpMult, atk: cfg.eliteAtkMult };
    return { hp: 1, atk: 1 };
  }
  // 스테이지(복리) × 난이도(이전 난이도 마지막 스테이지 대비 +20%) 배율.
  // growthRate에 stageHpGrowth/stageAtkGrowth를 넣어 HP/공격력 각각 계산한다.
  function stageAndDifficultyMult(floor, growthRate) {
    const stageInTier = getStageInTier(floor);
    const diffIdx = getDifficultyIndex(floor);
    const finalStageMult = Math.pow(growthRate, cfg.stagesPerLifeStage - 1);
    const difficultyMult = Math.pow(finalStageMult * cfg.difficultyJumpBonus, diffIdx);
    return Math.pow(growthRate, stageInTier) * difficultyMult;
  }

  function computeStats() {
    const g = state.goldUpg, p = state.pets, r = state.rpUpg;
    const flatAtk = 5 + g.atk * 2;
    const atk = flatAtk * (1 + r.ratk * 0.1);
    const autoAttackBase = g.autoAttack > 0 ? g.autoAttack * cfg.autoAttackPerLevel : 0;
    const atkSpeed = autoAttackBase * (1 + g.atkspeed * 0.1) * (1 + r.ratkspeed * 0.05);
    const spawnDelay = Math.max(150, cfg.spawnDelayBase * (1 - Math.min(0.9, g.movespeed * 0.05)) * (1 - Math.min(0.9, r.rmove * 0.05)));
    const critChance = Math.min(0.75, 0.05 + g.crit * 0.01 + p.owl * 0.005 + r.rcrit * 0.01);
    const critDamage = 1.5 + g.critdmg * 0.1 + r.rcritdmg * 0.15;
    const petDps = p.dog * 3 + p.dragon * 15;
    const goldMult = 1 + p.cat * 0.05;
    return { atk, atkSpeed, spawnDelay, critChance, critDamage, petDps, goldMult, hasAutoAttack: g.autoAttack > 0 };
  }

  function monsterHpFor(floor) {
    const grade = gradeMult(getMonster(floor));
    return Math.ceil(cfg.hpBase * stageAndDifficultyMult(floor, cfg.stageHpGrowth) * grade.hp);
  }
  // 지금은 몬스터가 반격하지 않는 클리커 구조라 전투에 쓰이진 않지만,
  // 기획서의 "몬스터 공격력" 수치를 그대로 보존해둔다 (추후 반격 패턴 추가 대비).
  function monsterAtkFor(floor) {
    const grade = gradeMult(getMonster(floor));
    return Math.ceil(cfg.atkBase * stageAndDifficultyMult(floor, cfg.stageAtkGrowth) * grade.atk);
  }
  function goldRewardFor(floor, goldMult) {
    const stageInTier = getStageInTier(floor);
    const diffIdx = getDifficultyIndex(floor);
    const mult = Math.pow(cfg.goldStageGrowth, stageInTier) * Math.pow(cfg.goldDifficultyGrowth, diffIdx);
    return Math.ceil(cfg.goldBase * mult * goldMult * cfg.goldMultiplier);
  }
  function rpGainFor(floor) {
    const base = Math.max(1, Math.floor(Math.pow(floor, cfg.rpGainExponent) / cfg.rpGainDivisor));
    const mult = 1 + (state.rpUpg.rpBoost || 0) * 0.1;
    return Math.max(1, Math.round(base * mult));
  }

  // ---------- DOM ----------
  const el = {
    body: document.body,
    gold: document.getElementById('goldDisplay'),
    rp: document.getElementById('rpDisplay'),
    stageName: document.getElementById('stageName'),
    stageSub: document.getElementById('stageSub'),
    floor: document.getElementById('floorDisplay'),
    monsterName: document.getElementById('monsterName'),
    hpFill: document.getElementById('hpFill'),
    hpText: document.getElementById('hpText'),
    monsterBtn: document.getElementById('monsterBtn'),
    statAtk: document.getElementById('statAtk'),
    statSpeed: document.getElementById('statSpeed'),
    statCrit: document.getElementById('statCrit'),
    statCritDmg: document.getElementById('statCritDmg'),
    statPetDps: document.getElementById('statPetDps'),
    statSpawn: document.getElementById('statSpawn'),
    recommendBanner: document.getElementById('recommendBanner'),
    shopList: document.getElementById('shopList'),
    petsList: document.getElementById('petsList'),
    rpShopList: document.getElementById('rpShopList'),
    rpGainPreview: document.getElementById('rpGainPreview'),
    rebirthBtn: document.getElementById('rebirthBtn'),
    arena: document.getElementById('arena'),
    player: document.getElementById('player'),
    petRow: document.getElementById('petRow'),
    layerFar: document.getElementById('layerFar'),
    layerMid: document.getElementById('layerMid'),
    roadFill: document.getElementById('roadFill'),
    nicknameInput: document.getElementById('nicknameInput'),
    submitRankBtn: document.getElementById('submitRankBtn'),
    rankMySummary: document.getElementById('rankMySummary'),
    rankLocalNote: document.getElementById('rankLocalNote'),
    rankList: document.getElementById('rankList'),
    rankEmptyNote: document.getElementById('rankEmptyNote'),
    footerNote: document.getElementById('footerNote'),
    toast: document.getElementById('toast'),
  };

  let lastTierIdx = -1;
  function buildParallaxLayers(tierIdx) {
    const deco = TIERS[tierIdx].deco;
    const buildGroup = () => {
      let html = '<div class="grp">';
      for (let i = 0; i < 5; i++) { deco.forEach(ic => { html += '<span>' + ic + '</span>'; }); }
      html += '</div>';
      return html;
    };
    const groupsHtml = buildGroup() + buildGroup();
    el.layerFar.innerHTML = groupsHtml;
    el.layerMid.innerHTML = groupsHtml;
  }

  function renderPetSprites() {
    el.petRow.innerHTML = '';
    PET_DEFS.forEach((p, i) => {
      const lvl = state.pets[p.id];
      if (lvl <= 0) return;
      const span = document.createElement('span');
      span.className = 'pet-sprite walking';
      span.textContent = p.emoji;
      span.style.animationDelay = (-0.15 * i) + 's';
      span.title = p.name + ' Lv.' + lvl;
      el.petRow.appendChild(span);
    });
  }

  // ---------- 토스트 ----------
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }
  window.showToast = showToast; // auth.js에서도 같은 토스트 UI를 재사용

  // ---------- 렌더 ----------
  function renderTopBar() {
    el.gold.textContent = formatNum(state.gold);
    el.rp.textContent = formatNum(state.rp);
    const tierIdx = getTierIndex(state.floor);
    const tier = TIERS[tierIdx];
    el.body.setAttribute('data-stage', String(tierIdx));
    el.stageName.textContent = tier.name;
    el.stageSub.textContent = tier.sub;
    const diffIdx = getDifficultyIndex(state.floor);
    el.floor.textContent = DIFFICULTIES[diffIdx] + ' · ' + (getStageInTier(state.floor) + 1) + '/' + cfg.stagesPerLifeStage;
    el.player.textContent = tier.player;
    if (tierIdx !== lastTierIdx) {
      buildParallaxLayers(tierIdx);
      lastTierIdx = tierIdx;
    }
    const progressInTier = (getStageInTier(state.floor) / cfg.stagesPerLifeStage) * 100;
    el.roadFill.style.width = progressInTier + '%';
  }

  function renderMonster() {
    const m = getMonster(state.floor);
    el.monsterName.textContent = m.name;
    el.monsterBtn.textContent = m.emoji;
    const pct = Math.max(0, (state.monsterHp / state.monsterMaxHp) * 100);
    el.hpFill.style.width = pct + '%';
    el.hpText.textContent = formatNum(Math.max(0, state.monsterHp)) + ' / ' + formatNum(state.monsterMaxHp);
  }

  function updateWalkDur(s) {
    const stats = s || computeStats();
    const walkDur = Math.max(0.32, Math.min(0.9, stats.spawnDelay / 900));
    el.arena.style.setProperty('--walk-dur', walkDur.toFixed(2) + 's');
  }

  function renderStats() {
    const s = computeStats();
    el.statAtk.textContent = formatNum(s.atk);
    el.statSpeed.textContent = s.hasAutoAttack ? (s.atkSpeed.toFixed(2) + '/초') : '미보유';
    el.statCrit.textContent = Math.round(s.critChance * 100) + '%';
    el.statCritDmg.textContent = Math.round(s.critDamage * 100) + '%';
    el.statPetDps.textContent = formatNum(s.petDps);
    el.statSpawn.textContent = Math.round(s.spawnDelay) + 'ms';

    updateWalkDur(s);

    const totalDps = s.atk * s.atkSpeed + s.petDps;
    const timeToKill = state.monsterHp > 0 ? state.monsterHp / Math.max(0.01, totalDps) : 0;
    el.recommendBanner.classList.toggle('show', false); // 환생 추천 배너는 사용자 요청으로 비활성화

    el.rpGainPreview.textContent = rpGainFor(state.floor) + ' RP';
  }

  function renderShop() {
    el.shopList.innerHTML = '';
    GOLD_UPGRADES.forEach(u => {
      const lvl = state.goldUpg[u.id];
      const cost = costFor(u.base, u.mult, lvl);
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML =
        '<div class="emoji">' + u.emoji + '</div>' +
        '<div class="info"><div class="name">' + u.name + '</div>' +
        '<div class="desc">' + u.desc + '</div>' +
        '<div class="lvl">Lv.' + lvl + '</div></div>' +
        '<button class="buy-btn" data-buy="' + u.id + '" ' + (state.gold < cost ? 'disabled' : '') + '>💰 ' + formatNum(cost) + '</button>';
      el.shopList.appendChild(row);
    });
    el.shopList.querySelectorAll('[data-buy]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-buy');
        const u = GOLD_UPGRADES.find(x => x.id === id);
        const lvl = state.goldUpg[id];
        const cost = costFor(u.base, u.mult, lvl);
        if (state.gold >= cost) {
          state.gold -= cost;
          state.goldUpg[id]++;
          if (id === 'autoAttack' && lvl === 0) showToast('🤖 자동 공격 시스템 해금!');
          renderAll();
          save();
        }
      };
    });
  }

  function renderPets() {
    el.petsList.innerHTML = '';
    PET_DEFS.forEach(p => {
      const lvl = state.pets[p.id];
      const cost = costFor(p.base, p.mult, lvl);
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML =
        '<div class="emoji">' + p.emoji + '</div>' +
        '<div class="info"><div class="name">' + p.name + '</div>' +
        '<div class="desc">' + p.desc + '</div>' +
        '<div class="lvl">' + (lvl === 0 ? '미보유' : 'Lv.' + lvl) + '</div></div>' +
        '<button class="buy-btn" data-pet="' + p.id + '" ' + (state.gold < cost ? 'disabled' : '') + '>' + (lvl === 0 ? '💰 ' + formatNum(cost) + ' 영입' : '💰 ' + formatNum(cost)) + '</button>';
      el.petsList.appendChild(row);
    });
    el.petsList.querySelectorAll('[data-pet]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-pet');
        const p = PET_DEFS.find(x => x.id === id);
        const lvl = state.pets[id];
        const cost = costFor(p.base, p.mult, lvl);
        if (state.gold >= cost) {
          state.gold -= cost;
          state.pets[id]++;
          if (lvl === 0) showToast(p.emoji + ' ' + p.name + ' 합류!');
          renderPetSprites();
          renderAll();
          save();
        }
      };
    });
    renderPetSprites();
  }

  function renderRpShop() {
    el.rpShopList.innerHTML = '';
    RP_UPGRADES.forEach(u => {
      const lvl = state.rpUpg[u.id];
      const cost = costFor(u.base, u.mult, lvl);
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML =
        '<div class="emoji">' + u.emoji + '</div>' +
        '<div class="info"><div class="name">' + u.name + '</div>' +
        '<div class="desc">' + u.desc + '</div>' +
        '<div class="lvl">Lv.' + lvl + '</div></div>' +
        '<button class="buy-btn" data-rp="' + u.id + '" ' + (state.rp < cost ? 'disabled' : '') + '>✨ ' + formatNum(cost) + '</button>';
      el.rpShopList.appendChild(row);
    });
    el.rpShopList.querySelectorAll('[data-rp]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-rp');
        const u = RP_UPGRADES.find(x => x.id === id);
        const lvl = state.rpUpg[id];
        const cost = costFor(u.base, u.mult, lvl);
        if (state.rp >= cost) {
          state.rp -= cost;
          state.rpUpg[id]++;
          renderAll();
          save();
        }
      };
    });
  }

  function renderAll() {
    renderTopBar();
    renderMonster();
    renderStats();
    renderShop();
    renderPets();
    renderRpShop();
  }

  // ---------- 애니메이션 상태 ----------
  function setPlayerAnim(name, revertMs) {
    el.player.classList.remove('walking', 'punching');
    void el.player.offsetWidth;
    el.player.classList.add(name);
    if (revertMs) {
      setTimeout(() => {
        el.player.classList.remove(name);
        el.player.classList.add('walking');
      }, revertMs);
    }
  }
  function setMonsterAnim(name, revertMs) {
    el.monsterBtn.classList.remove('walking-monster', 'shake', 'spawn-in', 'defeated');
    void el.monsterBtn.offsetWidth;
    el.monsterBtn.classList.add(name);
    if (revertMs) {
      setTimeout(() => {
        el.monsterBtn.classList.remove(name);
        el.monsterBtn.classList.add('walking-monster');
      }, revertMs);
    }
  }

  // ---------- 전투 로직 ----------
  function spawnMonster() {
    state.monsterMaxHp = monsterHpFor(state.floor);
    state.monsterHp = state.monsterMaxHp;
    isDead = false;
    renderMonster();
    renderStats();
    el.arena.classList.remove('sprint');
    updateWalkDur();
    setMonsterAnim('spawn-in', 300);
  }

  function spawnFloatDamage(dmg, crit) {
    const rect = el.monsterBtn.getBoundingClientRect();
    const arenaRect = el.arena.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float-dmg' + (crit ? ' crit' : '');
    d.textContent = (crit ? '💥 ' : '') + formatNum(dmg);
    const offsetX = (rect.left - arenaRect.left) + rect.width / 2 + (Math.random() * 60 - 30);
    const offsetY = (rect.top - arenaRect.top) + (Math.random() * 20);
    d.style.left = offsetX + 'px';
    d.style.top = offsetY + 'px';
    el.arena.appendChild(d);
    setTimeout(() => d.remove(), 820);
  }

  function performAttack() {
    if (isDead || state.monsterHp <= 0) return;
    const s = computeStats();
    const crit = Math.random() < s.critChance;
    let dmg = s.atk * (crit ? s.critDamage : 1);
    dmg = Math.max(1, dmg);
    state.monsterHp -= dmg;
    spawnFloatDamage(dmg, crit);
    setMonsterAnim('shake', 130);
    setPlayerAnim('punching', 160);

    if (state.monsterHp <= 0) {
      handleKill(s);
    } else {
      renderMonster();
    }
  }

  function handleKill(s) {
    isDead = true;
    const reward = goldRewardFor(state.floor, s.goldMult);
    state.gold += reward;
    state.floor += 1;
    state.maxFloorEver = Math.max(state.maxFloorEver || 0, state.floor);
    setMonsterAnim('defeated');
    el.arena.classList.add('sprint');
    el.arena.style.setProperty('--walk-dur', '0.28s');
    renderTopBar();
    renderStats();
    renderShop();
    renderPets();
    setTimeout(() => {
      spawnMonster();
      save();
    }, s.spawnDelay);
  }

  // ---------- 틱 (자동 공격 + 펫 데미지) ----------
  function tick(now) {
    const dt = Math.min(0.25, (now - lastTick) / 1000);
    lastTick = now;
    if (!isDead && state.monsterHp > 0) {
      const s = computeStats();
      if (s.atkSpeed > 0) {
        atkAccumulator += dt * s.atkSpeed;
        while (atkAccumulator >= 1) {
          atkAccumulator -= 1;
          performAttack();
          if (isDead) break;
        }
      }
      if (!isDead && s.petDps > 0 && state.monsterHp > 0) {
        state.monsterHp -= s.petDps * dt;
        if (state.monsterHp <= 0) {
          handleKill(s);
        } else {
          renderMonster();
        }
      }
    }
    requestAnimationFrame(tick);
  }

  // ---------- 환생 (안내 페이지 없이 즉시 실행) ----------
  function doRebirth() {
    const gain = rpGainFor(state.floor);
    const reachedFloor = state.floor + 1;
    state.rp += gain;
    state.totalRpEarned += gain;
    state.rebirths += 1;
    state.floor = 0;
    state.gold = 0;
    state.goldUpg = { atk: 0, autoAttack: 0, atkspeed: 0, movespeed: 0, crit: 0, critdmg: 0 };
    state.pets = { dog: 0, cat: 0, owl: 0, dragon: 0 };
    spawnMonster();
    renderPetSprites();
    renderAll();
    save();
    showToast('🔄 환생 완료! ' + reachedFloor + '층까지 도달 · +' + gain + ' RP');
  }

  // ---------- 탭 (하단 네비게이션) ----------
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.getAttribute('data-tab')).classList.add('active');
      if (btn.getAttribute('data-tab') === 'rank') refreshLeaderboard();
    };
  });

  el.monsterBtn.addEventListener('click', () => { performAttack(); });
  el.rebirthBtn.addEventListener('click', doRebirth);

  // ---------- 랭킹 ----------
  function renderLeaderboard(list) {
    el.rankList.innerHTML = '';
    if (!list || list.length === 0) {
      el.rankEmptyNote.textContent = '아직 등록된 랭킹이 없어요. 첫 번째로 등록해보세요!';
      el.rankEmptyNote.style.display = 'block';
      return;
    }
    el.rankEmptyNote.style.display = 'none';
    list.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (entry.name === state.nickname ? ' me' : '');
      row.innerHTML =
        '<span class="rank-no">' + (i + 1) + '</span>' +
        '<span class="rank-name">' + escapeHtml(entry.name) + '</span>' +
        '<span>' + formatNum(entry.totalRp) + '</span>' +
        '<span>' + (entry.maxFloor + 1) + '층</span>';
      el.rankList.appendChild(row);
    });
  }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function updateMySummary() {
    el.rankMySummary.textContent =
      '내 기록 — RP ' + formatNum(state.totalRpEarned) + ' · 최고 ' + ((state.maxFloorEver || 0) + 1) + '층 · 환생 ' + state.rebirths + '회';
  }

  async function refreshLeaderboard() {
    el.rankEmptyNote.textContent = '불러오는 중...';
    el.rankEmptyNote.style.display = 'block';
    el.rankList.innerHTML = '';
    updateMySummary();
    try {
      const list = await window.GameStorage.fetchLeaderboard();
      list.sort((a, b) => b.totalRp - a.totalRp);
      renderLeaderboard(list.slice(0, 30));
    } catch (e) {
      el.rankEmptyNote.textContent = '랭킹을 불러올 수 없어요. 잠시 후 다시 시도해주세요.';
      el.rankEmptyNote.style.display = 'block';
    }
  }

  let rankBusy = false;
  async function submitScore() {
    const raw = (el.nicknameInput.value || '').trim();
    if (!raw) { el.nicknameInput.focus(); return; }
    const name = raw.slice(0, 12);
    state.nickname = name;
    if (rankBusy) return;
    rankBusy = true;
    el.submitRankBtn.disabled = true;
    el.submitRankBtn.textContent = '등록 중';
    try {
      const entry = {
        name,
        totalRp: state.totalRpEarned || 0,
        maxFloor: state.maxFloorEver || 0,
        rebirths: state.rebirths || 0,
        updatedAt: Date.now(),
      };
      const list = await window.GameStorage.submitLeaderboardEntry(entry);
      renderLeaderboard(list);
      updateMySummary();
      save();
      showToast('🏆 랭킹에 등록됐어요!');
    } catch (e) {
      el.rankEmptyNote.textContent = '랭킹 등록에 실패했어요. 네트워크 상태를 확인해주세요.';
      el.rankEmptyNote.style.display = 'block';
    } finally {
      rankBusy = false;
      el.submitRankBtn.disabled = false;
      el.submitRankBtn.textContent = '등록';
    }
  }
  el.submitRankBtn.addEventListener('click', submitScore);

  // ---------- 저장 ----------
  let saveTimer = null;
  let storageWarned = false;
  let storageAvailable = true;
  function showStorageWarning() {
    if (storageWarned) return;
    storageWarned = true;
    storageAvailable = false;
    el.footerNote.textContent = '⚠️ 저장을 사용할 수 없어요. 새로고침하면 진행 상황이 초기화됩니다.';
  }
  function flashSaved() {
    if (storageWarned) return;
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    el.footerNote.textContent = (window.GameStorage.hasCloudStorage ? '서버에 저장됨 · ' : '이 기기에 저장됨 · ') + hh + ':' + mm;
  }
  function save() {
    if (!storageAvailable) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await window.GameStorage.saveGame(state);
        flashSaved();
      } catch (e) {
        showStorageWarning();
        console.warn('저장 기능을 사용할 수 없어 이후 저장을 건너뜁니다.', e);
      }
    }, 400);
  }

  function mergeState(loaded) {
    if (!loaded) return;
    state = Object.assign(state, loaded);
    state.goldUpg = Object.assign({ atk: 0, autoAttack: 0, atkspeed: 0, movespeed: 0, crit: 0, critdmg: 0 }, loaded.goldUpg || {});
    state.pets = Object.assign({ dog: 0, cat: 0, owl: 0, dragon: 0 }, loaded.pets || {});
    state.rpUpg = Object.assign({ ratk: 0, ratkspeed: 0, rmove: 0, rcrit: 0, rcritdmg: 0, rpBoost: 0 }, loaded.rpUpg || {});
  }

  // ---------- 초기화 ----------
  (async function init() {
    cfg = await window.loadGameConfig();
    const loaded = await window.GameStorage.loadSave();
    mergeState(loaded);
    if (el.nicknameInput) el.nicknameInput.value = state.nickname || '';
    if (!window.GameStorage.hasCloudStorage && el.rankLocalNote) el.rankLocalNote.style.display = 'block';

    if (state.monsterMaxHp <= 0 || state.monsterHp === undefined) {
      state.monsterMaxHp = monsterHpFor(state.floor);
      state.monsterHp = state.monsterMaxHp;
    }
    renderAll();
    lastTick = performance.now();
    requestAnimationFrame(tick);
    setInterval(save, 5000);
  })();
})();
