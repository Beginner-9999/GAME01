# 인생게임 PWA 패키지

APK로 만들었을 때 주소창이 보이는 이유는 대부분 **PWA 요건(매니페스트/아이콘/서비스워커)이 없거나, 앱이 도메인 소유를 증명하지 못해서**입니다.
PWABuilder는 Android용으로 만들 때 "TWA(Trusted Web Activity)"라는 방식을 쓰는데, 이건 **실제 호스팅된 HTTPS 주소**를 기준으로 동작하고, 그 주소가 내 앱이 맞다는 걸 증명(Digital Asset Links)해야 주소창 없는 완전한 앱처럼 보입니다. 이 폴더는 그 요건을 채운 버전입니다.

## 폴더 구성
```
pwa-package/
├─ index.html         (게임 본체 - 매니페스트/아이콘/서비스워커 연결 완료)
├─ manifest.json       (앱 이름/아이콘/실행 방식 정의)
├─ sw.js                (오프라인 캐시용 서비스워커)
└─ icons/
   ├─ icon-192.png
   ├─ icon-512.png
   └─ icon-maskable-512.png
```

## 진행 순서

### 1. 실제 주소로 호스팅하기
PWABuilder는 로컬 파일이 아니라 **살아있는 HTTPS 주소**를 스캔합니다. 아래 중 하나에 이 폴더 전체를 그대로 올리세요 (모두 무료, 회원가입만 필요).
- GitHub Pages
- Netlify (netlify.com에 폴더 드래그 앤 드롭으로 가장 빠름)
- Vercel

올릴 때 폴더 구조를 그대로 유지해야 합니다 (`index.html`과 `manifest.json`, `icons/`가 같은 위치에 있어야 함).

### 2. PWA로 제대로 인식되는지 확인
배포된 주소를 크롬(안드로이드나 PC 모두 가능)에서 열고 개발자도구 → Lighthouse → PWA 검사를 돌려보세요. "Installable" 항목이 통과해야 다음 단계가 의미 있습니다. 안드로이드 크롬에서 그 주소를 열었을 때 "홈 화면에 추가"로 설치한 아이콘을 눌렀을 때 주소창 없이 열리면 정상입니다.

### 3. PWABuilder로 APK 생성
1. https://www.pwabuilder.com 접속
2. 배포한 주소 입력 → Start
3. "Android" 패키지 선택 → 옵션에서 **Package type: TWA(Trusted Web Activity)** 확인
4. Generate 후 zip 다운로드 (여기에 signing key와 `assetlinks.json` 파일, SHA-256 fingerprint 정보가 들어있음)

### 4. 주소창을 완전히 없애는 핵심 단계: assetlinks.json 배포
PWABuilder가 만들어준 zip 안에 `assetlinks.json`이 들어있습니다. 이 파일을 내 사이트의 아래 경로에 그대로 올려야 합니다.
```
https://내도메인/.well-known/assetlinks.json
```
이 파일이 없으면 안드로이드가 "이 앱이 진짜 이 웹사이트 주인인지" 확인을 못 해서, 안전을 위해 브라우저 주소창이 있는 커스텀 탭 형태로 열립니다. 파일을 올린 뒤 앱을 삭제 후 재설치하면 주소창 없는 완전한 앱 화면으로 실행됩니다.

### 5. (선택) 상태바/스플래시 다듬기
`manifest.json`의 `theme_color`, `background_color`로 상태바·스플래시 배경색을 조절할 수 있고, `display`를 `fullscreen`으로 바꾸면 상태바까지 가릴 수 있습니다 (다만 시계/배터리 표시가 사라지니 대부분 `standalone`을 추천합니다).

## 참고
- `index.html`은 기존 게임 로직을 그대로 유지했고, PWA 관련 태그(`<link rel="manifest">`, 아이콘, 서비스워커 등록 스크립트)와 노치 대응 안전영역 패딩만 추가했습니다.
- 게임 저장/랭킹 기능(`window.storage`)은 Claude 아티팩트 환경 전용 API라 이 독립 패키지에서는 동작하지 않습니다. APK로 배포할 계획이라면 저장은 `localStorage`로, 랭킹은 별도의 백엔드(Firebase 등)로 바꾸는 작업이 필요합니다. 원하시면 이 부분도 도와드릴게요.

## 캐릭터/몬스터 이미지를 외부에서 불러와 쓰기

`index.html`의 `<script>` 안, `RP_UPGRADES` 바로 아래에 이미지 연동 설정 블록이 있습니다.

```js
const CHARACTER_IMAGES = {
  // 0: 'https://예시.com/characters/baby.png',   // 아기
  // 1: 'https://예시.com/characters/boy.png',    // 소년
  // ...
};
const MONSTER_IMAGES = {
  // '젖병': 'https://예시.com/monsters/bottle.png',
};
const PET_IMAGES = {
  // dog: 'https://예시.com/pets/dog.png',
};
```

- `CHARACTER_IMAGES`의 key는 인생 스테이지 순서(0=아기 ~ 5=할아버지)
- `MONSTER_IMAGES`의 key는 몬스터 이름 문자열 (예: `'젖병'`, `'상사'`)과 정확히 일치해야 함
- `PET_IMAGES`의 key는 펫 id (`dog`, `cat`, `owl`, `dragon`)
- 값에 이미지 URL을 넣으면 그 즉시 이모지 대신 이미지가 사용되고, **비워두거나 링크가 깨지면 자동으로 이모지로 되돌아가서** 게임이 깨지지 않습니다.

### 이미지 규격
| 항목 | 권장값 |
|---|---|
| 형식 | PNG(투명 배경) 또는 WebP |
| 크기 | 512×512px 정사각형 |
| 여백 | 캐릭터/몬스터를 중앙에 두고 가장자리 10~15% 여백 확보 |
| 용량 | 200KB 이하 (모바일 로딩 속도) |

화면에는 CSS가 자동으로 축소해서 보여주므로 원본은 고해상도로 준비해도 됩니다.

### 이미지를 어디에 올릴지
URL만 접근 가능하면 어디든 상관없습니다.
- 이 PWA와 같은 사이트에 `assets/characters/`, `assets/monsters/` 폴더를 만들어 함께 배포 (가장 안정적, CORS 문제 없음)
- GitHub raw 링크, Cloudinary, imgur 등 외부 이미지 호스팅

### (선택) 코드 수정 없이 이미지만 나중에 교체하고 싶다면
`IMAGE_MANIFEST_URL`에 아래 형식의 JSON을 반환하는 주소를 넣어두면, 게임을 켤 때마다 자동으로 불러와 위 세 객체에 병합됩니다. 이후 이미지를 바꾸고 싶을 땐 이 JSON 파일만 갱신하면 되고, `index.html`을 다시 배포할 필요가 없습니다.

```json
{
  "characters": { "0": "https://.../baby.png" },
  "monsters":   { "젖병": "https://.../bottle.png" },
  "pets":       { "dog": "https://.../dog.png" }
}
```

