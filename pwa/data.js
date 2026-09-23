// ============================================================
// data.js
// 게임 콘텐츠(스테이지/몬스터/상점/펫/환생 강화) 정의.
// 밸런스 "수치"는 config.js(서버 /api/config)에서, 콘텐츠 "구성"은
// 여기서 관리한다. 인생 단계를 늘리고 싶으면 TIERS 배열에
// 항목을 추가하면 된다.
// ============================================================
(function () {
  "use strict";

  const TIERS = [
    { name:'아기', sub:'무럭무럭 자라는 중', player:'👶', deco:['☁️','🎈','☁️','🧸','☁️','🌈'], monsters:[
        {name:'젖병', emoji:'🍼'},{name:'기저귀', emoji:'🧷'},{name:'공갈젖꼭지', emoji:'🚼'},
        {name:'딸랑이', emoji:'🎵'},{name:'분유', emoji:'🥛'} ]},
    { name:'소년', sub:'꿈 많은 학창 시절', player:'🧒', deco:['🏫','🌳','⚽','🌳','🎒','🌳'], monsters:[
        {name:'책', emoji:'📚'},{name:'친구', emoji:'👬'},{name:'운동', emoji:'⚽'},
        {name:'학원', emoji:'🏫'},{name:'숙제', emoji:'📝'} ]},
    { name:'청년', sub:'불타는 청춘', player:'🧑', deco:['🏙️','💡','🌃','🏙️','🎶','🌃'], monsters:[
        {name:'술', emoji:'🍺'},{name:'미인', emoji:'💃'},{name:'과제', emoji:'📄'},
        {name:'취업', emoji:'💼'},{name:'면접', emoji:'🎤'} ]},
    { name:'성인', sub:'사회초년생', player:'👨‍💼', deco:['🏢','🚗','🏢','🚕','🏢','🚗'], monsters:[
        {name:'일', emoji:'💻'},{name:'상사', emoji:'😠'},{name:'연봉협상', emoji:'💰'},
        {name:'야근', emoji:'🌙'},{name:'회의', emoji:'📊'} ]},
    { name:'아저씨', sub:'가장의 무게', player:'🧔', deco:['🏠','🌳','🚙','🏠','🌳','🚙'], monsters:[
        {name:'결혼생활', emoji:'💍'},{name:'잔소리', emoji:'🗣️'},{name:'육아', emoji:'👶'},
        {name:'대출', emoji:'🏦'},{name:'중년의 위기', emoji:'😩'} ]},
    { name:'할아버지', sub:'인생의 황혼', player:'👴', deco:['🌳','🪑','⛲','🌳','🪑','⛲'], monsters:[
        {name:'장기', emoji:'♟️'},{name:'바둑', emoji:'⚫'},{name:'노인정', emoji:'🏠'},
        {name:'지팡이', emoji:'🦯'},{name:'손주', emoji:'👴'} ]},
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

  window.GAME_DATA = { TIERS, GOLD_UPGRADES, PET_DEFS, RP_UPGRADES };
})();
