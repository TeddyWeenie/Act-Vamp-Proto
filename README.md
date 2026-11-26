# 녹턴: 세 개의 서약

뱀파이어 귀족, 늑대인간 장교, 인간 기공사가 함께 진실을 캐는 반실시간 파티 RPG입니다.
3D 배경 위에 2D 캐릭터를 세운 2.5D 화면으로 다시 만들고 있습니다. 목표 플랫폼은 웹과 Steam입니다.

지금은 제1장의 첫 화면 시험판입니다. 리시엔이 위에서 비스듬히 내려다본 마을 광장을 위아래좌우 네 방향으로 걸어 다니고, 건물 뒤로 가면 건물이 반투명해집니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm test` | 단위 테스트 |
| `npm run typecheck` | 타입 검사 |
| `npm run build` | 타입 검사 후 `dist/`에 빌드 |
| `npm run preview` | 빌드 결과 미리 보기 |

## 조작

- `W` `A` `S` `D` 또는 방향키, 바닥 클릭: 이동
- `Space`: 기본 공격
- 휠: 확대·축소

기본 화면은 건물에 카툰 효과를 입히지 않은 화면입니다(건물은 3D로 만든 그대로의 텍스처, 캐릭터는 과장된 카툰 화풍). 주소 끝에 `?look=cartoon`을 붙이면 카툰 렌더링을 입힌 화면으로 비교해 볼 수 있습니다.

카메라 구도는 비스듬한 탑뷰 50도입니다(앞·뒤·왼쪽·오른쪽 4방향). `?pitch=45`처럼 내려다보는 각도(30~80)를 바꿔 볼 수 있고, `?view=quarter`를 붙이면 예전 45도 쿼터뷰로 비교해 볼 수 있습니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/GAME-DESIGN.md](docs/GAME-DESIGN.md) | 세계관, 등장인물, 제1장 시나리오와 대사, 전투 규칙, 설계 원칙 |
| [docs/ART-DIRECTION.md](docs/ART-DIRECTION.md) | 확정한 화면 규칙, 스프라이트와 3D 배경을 만드는 방법 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 코드 구조, 객체지향과 SOLID 적용 방식 |
| [docs/art-direction/](docs/art-direction/) | 컨셉 시트와 생성 지시문 |
| [docs/archive/](docs/archive/) | 3D 프로토타입 시절의 README, 캐릭터 설계 메모, 대사가 들어 있던 원본 스크립트 |

## 기술

Three.js, TypeScript, Vite, Vitest. 배포는 Vercel을 쓰며(`vercel.json`), 배포는 요청이 있을 때만 합니다.

## 이전 3D 프로토타입

캐릭터까지 3D로 만들었던 이전 판의 코드와 모델은 이 정리 이전의 커밋 기록에 남아 있습니다.
기획 내용(세계관, 시나리오, 전투 규칙)은 위 문서와 `src/data/chapter1.ts`, `src/core/rules.js`로 옮겼습니다.

## 참고와 권리

- 그래픽과 연출 방식은 2000년작 RPG 「악튜러스」의 3D 배경 + 2D 캐릭터 방식을 참고했습니다. 원작의 캐릭터, 지도, 음악, 대사, 이미지는 쓰지 않습니다.
- 캐릭터와 배경 그림, 3D 모델은 이 프로젝트를 위해 새로 만든 것입니다.
- Three.js는 MIT 라이선스입니다.
