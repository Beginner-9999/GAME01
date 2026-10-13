// ============================================================
// data.js
// 게임 콘텐츠(스테이지/몬스터/상점/펫/환생 강화) 정의.
// 밸런스 "수치"는 config.js(서버 /api/config)에서, 콘텐츠 "구성"은
// 여기서 관리한다. 인생 단계를 늘리고 싶으면 TIERS 배열에
// 항목을 추가하면 된다.
// ============================================================
(function () {
  "use strict";

  // 난이도 10단계 (Beginner~Godlike). floor가 life-stage당 stagesPerLifeStage(기본 40)를
  // 다 지나면 다음 난이도로 넘어간다 - app.js의 getDifficultyIndex 참고.
  const DIFFICULTIES = ['Beginner', 'Easy', 'Normal', 'Hard', 'Expert', 'Master', 'Nightmare', 'Hell', 'Insane', 'Godlike'];

  // 인생 단계 5개 (기획서 2026-10-13 업데이트 기준: 청년 콘텐츠는 성인 단계의
  // 대학/취업 던전으로 흡수됨). 각 몬스터의 grade:'boss'는 해당 구간(던전)의
  // 마지막 스테이지에 등장하는 보스를 뜻한다 - app.js가 40칸 스케줄로 자동 배치한다.
  // 성인 단계는 보스가 2마리(대학·취업 던전 / 회사 프로젝트 던전)라 구간이 2개로 나뉜다.
  const TIERS = [
    { name:'아기', sub:'무럭무럭 자라는 중', player:'👶', deco:['☁️','🎈','☁️','🧸','☁️','🌈'], monsters:[
        {name:'젖병', emoji:'🍼', grade:'normal'},
        {name:'기저귀', emoji:'🧷', grade:'normal'},
        {name:'공갈젖꼭지', emoji:'🚼', grade:'normal'},
        {name:'예방접종', emoji:'💉', grade:'normal'},
        {name:'낮잠', emoji:'😴', grade:'normal'},
        {name:'울음', emoji:'😭', grade:'normal'},
        {name:'배고픔', emoji:'🍽️', grade:'normal'},
        {name:'목욕', emoji:'🛁', grade:'normal'},
        {name:'낯선 사람', emoji:'🙎', grade:'normal'},
        {name:'잠 안 오는 밤', emoji:'🌙', grade:'boss'} ]},
    { name:'소년', sub:'꿈 많은 학창 시절', player:'🧒', deco:['🏫','🌳','⚽','🌳','🎒','🌳'], monsters:[
        {name:'숙제', emoji:'📝', grade:'normal'},
        {name:'시험', emoji:'📋', grade:'normal'},
        {name:'선생님', emoji:'👩‍🏫', grade:'normal'},
        {name:'지각', emoji:'⏰', grade:'normal'},
        {name:'학원', emoji:'🏫', grade:'normal'},
        {name:'체육시간', emoji:'⚽', grade:'normal'},
        {name:'기말고사', emoji:'📚', grade:'boss'} ]},
    { name:'성인', sub:'대학생에서 직장인까지', player:'🧑', deco:['🏙️','🏢','💡','🚗','🏙️','🌃'], monsters:[
        // 대학·취업 던전 (구 청년 콘텐츠 흡수)
        {name:'과제', emoji:'📄', grade:'normal'},
        {name:'발표', emoji:'🎤', grade:'normal'},
        {name:'과음', emoji:'🍺', grade:'normal'},
        {name:'아르바이트', emoji:'💼', grade:'normal'},
        {name:'취업 준비', emoji:'📑', grade:'normal'},
        {name:'자격증', emoji:'🎓', grade:'normal'},
        {name:'군대', emoji:'🎖️', grade:'normal'},
        {name:'최종 면접관', emoji:'🧑‍💼', grade:'boss'},
        // 회사 프로젝트 던전
        {name:'업무', emoji:'💻', grade:'normal'},
        {name:'상사', emoji:'😠', grade:'normal'},
        {name:'회의', emoji:'📊', grade:'normal'},
        {name:'야근', emoji:'🌙', grade:'normal'},
        {name:'실적', emoji:'📈', grade:'normal'},
        {name:'프로젝트', emoji:'🗂️', grade:'normal'},
        {name:'업무 마감', emoji:'⏳', grade:'normal'},
        {name:'부장님', emoji:'👔', grade:'boss'} ]},
    { name:'아저씨', sub:'가장의 무게', player:'🧔', deco:['🏠','🌳','🚙','🏠','🌳','🚙'], monsters:[
        {name:'육아', emoji:'👶', grade:'normal'},
        {name:'집안일', emoji:'🧹', grade:'normal'},
        {name:'자녀교육', emoji:'📖', grade:'normal'},
        {name:'대출', emoji:'🏦', grade:'normal'},
        {name:'주택', emoji:'🏠', grade:'normal'},
        {name:'세금', emoji:'🧾', grade:'normal'},
        {name:'자동차 유지', emoji:'🚗', grade:'normal'},
        {name:'장보기', emoji:'🛒', grade:'normal'},
        {name:'부모님 병원', emoji:'🏥', grade:'normal'},
        {name:'내 집 마련의 시련', emoji:'🏚️', grade:'boss'} ]}, // 보스명은 기획서상 가칭
    { name:'할아버지', sub:'인생의 황혼', player:'👴', deco:['🌳','🪑','⛲','🌳','🪑','⛲'], monsters:[
        {name:'병원', emoji:'🏥', grade:'normal'},
        {name:'약', emoji:'💊', grade:'normal'},
        {name:'건강검진', emoji:'🩺', grade:'normal'},
        {name:'관절', emoji:'🦴', grade:'normal'},
        {name:'계단', emoji:'🪜', grade:'normal'},
        {name:'추위', emoji:'🥶', grade:'normal'},
        {name:'더위', emoji:'🥵', grade:'normal'},
        {name:'기억력 저하', emoji:'🧠', grade:'normal'},
        {name:'장거리 이동', emoji:'🚶', grade:'normal'},
        {name:'인생의 마지막 날', emoji:'🌅', grade:'boss'} ]},
  ];

  // 골드로 구매하는 강화 (환생 시 초기화됨)
  const GOLD_UPGRADES = [
    {id:'atk', name:'낡은 검', emoji:'⚔️', desc:'공격력 +2 (레벨당)', base:10, mult:1.15},
    {id:'autoAttack', name:'자동 공격 시스템', emoji:'🤖', desc:'미보유 시 자동 공격 없음 · 구매 시 초당 자동 공격 해금', base:120, mult:1.32},
    {id:'atkspeed', name:'손목시계', emoji:'⌚', desc:'자동 공격 속도 +10% (자동 공격 시스템 보유 시 적용)', base:25, mult:1.18},
    {id:'movespeed', name:'운동화', emoji:'👟', desc:'몬스터 등장 딜레이 -5% (레벨당)', base:15, mult:1.17},
    {id:'crit', name:'네잎클로버', emoji:'🍀', desc:'크리티컬 확률 +1% (레벨당)', base:25, mult:1.2},
    {id:'critdmg', name:'강화석', emoji:'💎', desc:'크리티컬 데미지 +10% (레벨당)', base:30, mult:1.2},
  ];

  // 골드로 영입/레벨업하는 펫 (환생 시 초기화됨, 화면에도 등장함)
  const PET_DEFS = [
    {id:'dog', name:'강아지', emoji:'🐶', desc:'초당 데미지 +3 (레벨당)', base:50, mult:1.22},
    {id:'cat', name:'고양이', emoji:'🐱', desc:'골드 획득 +5% (레벨당)', base:80, mult:1.24},
    {id:'owl', name:'부엉이', emoji:'🦉', desc:'크리티컬 확률 +0.5% (레벨당)', base:150, mult:1.27},
    {id:'dragon', name:'아기 드래곤', emoji:'🐉', desc:'초당 데미지 +15 (레벨당)', base:400, mult:1.3},
  ];

  // 환생 포인트(RP)로 구매하는 영구 강화 (환생해도 유지됨)
  const RP_UPGRADES = [
    {id:'ratk', name:'영구 공격력', emoji:'💪', desc:'공격력 +10% (레벨당)', base:1, mult:1.3},
    {id:'ratkspeed', name:'영구 공격속도', emoji:'⚡', desc:'자동 공격 속도 +5% (레벨당)', base:1, mult:1.3},
    {id:'rmove', name:'영구 이동속도', emoji:'🏃', desc:'등장 딜레이 -5% (레벨당)', base:1, mult:1.3},
    {id:'rcrit', name:'영구 크리확률', emoji:'🎯', desc:'크리티컬 확률 +1% (레벨당)', base:2, mult:1.35},
    {id:'rcritdmg', name:'영구 크리데미지', emoji:'🔥', desc:'크리티컬 데미지 +15% (레벨당)', base:2, mult:1.35},
    {id:'rpBoost', name:'환생 포인트 배율', emoji:'✨', desc:'환생 시 획득하는 RP +10% (레벨당)', base:3, mult:1.4},
  ];

  window.GAME_DATA = { TIERS, DIFFICULTIES, GOLD_UPGRADES, PET_DEFS, RP_UPGRADES };
})();
