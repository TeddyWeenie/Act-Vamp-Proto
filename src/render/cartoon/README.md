# 녹턴 카툰 렌더링 모듈

3D 배경(건물 GLB)과 2D 캐릭터 스프라이트가 한 그림처럼 보이게 하는 다섯 단계를 담은 TypeScript 모듈입니다.
three 외 의존성이 없습니다. three 0.187.0에서 타입 검사(`tsc --strict`)와 실제 렌더링을 확인했습니다(`example/smoke-test.png`).
수치는 2026-11-26 모델 뷰어(https://claude.ai/artifact/5GfgVd3crhieexTzmUbPwG)에서 민가 두 종과 리시엔 스프라이트로 맞춘 값입니다.

## 쓰는 법

```ts
import { CartoonLook, DEFAULT_CARTOON_SETTINGS, type LightingStage } from './cartoon';

const look = CartoonLook.createDefault({ ...DEFAULT_CARTOON_SETTINGS, characterHeight: 1.6 }); // 캐릭터 키(월드 단위)
look.attach(scene);                                   // 조명과 안개를 장면에 넣음
look.setSize(width, height, renderer.getPixelRatio());

const house = look.addBuilding(gltf.scene);           // 재질 교체 + 외곽선 추가
look.update({ camera, focus });                       // 고정 카메라면 한 번, focus는 화면 중앙의 바닥 지점

const lighting = look.stage<LightingStage>('light');
const shadow = lighting.createCharacterShadow();      // 발밑 둥근 그림자
scene.add(shadow);
lighting.placeShadow(shadow, feetPosition);           // 캐릭터가 움직일 때마다

look.render(renderer, scene, camera);                 // renderer.render 대신 호출
```

- 단계별 켜고 끄기: `look.setEnabled('outline', false)`. id는 `shade`, `outline`, `flatten`, `light`, `grade`.
- 전후 비교: `look.setAllEnabled(false)`.
- 가려진 건물 옅게: `house.setOpacity(0.3)`. 몸체와 외곽선이 함께 옅어지고 깊이를 쓰지 않습니다. 깊이만 그리는 사전 패스(colorWrite false)는 지금처럼 앞에 두세요. 그 패스 덕분에 외곽선 껍질은 실루엣 둘레만 남습니다. `example/smoke-test.ts`의 `fade` 분기에 그대로 있습니다.
- 재질만 필요하면: `new ToonMaterialFactory(settings.shade, [flattenPatch]).create(readMaterialSource(gltfMaterial))`.
- 후처리는 EffectComposer를 쓰지 않습니다. `ColorGradePass`가 직접 렌더 타깃(4x MSAA, HalfFloat, 24비트 깊이)에 그린 뒤 전체 화면 셰이더를 한 번 돌립니다. 자체 컴포저를 쓰고 싶으면 `colorGradeFragment(settings.grade)`와 `COLOR_GRADE_VERTEX`를 ShaderPass에 넣으면 됩니다(입력 텍스처 이름 `tDiffuse`, 입력은 선형, 출력은 표시용 sRGB).

## 다섯 단계와 최종 수치 (`src/settings.ts`)

길이는 모두 "캐릭터 키의 배수"입니다. `characterHeight`만 게임 값으로 바꾸면 따라갑니다.

| 단계 | 내용 | 수치 |
|---|---|---|
| 1 `shade` | MeshToonMaterial, 3단계 명암 | 밝기 0.47 / 0.745 / 1.0, 환경광 0.66×π, 주광 0.52×π |
| 2 `outline` | 뒤집은 껍질 외곽선 | 색 `#24121a`(스프라이트 선 색), 굵기 캐릭터 키의 1%, 카메라 반대쪽으로 굵기의 1.6배 밀기 |
| 3 `flatten` | 텍스처 밝기를 5단계로 부드럽게 모으고 팔레트 맞춤 | 강도 0.65, 채도 1.14, 어두운 쪽 (0.95, 0.88, 1.0), 밝은 쪽 (1.04, 1.0, 0.94), 밉 편향 0.6 |
| 4 `light` | 주광을 스프라이트 그림의 빛 방향(화면 왼쪽 위)에 맞춤 + 발밑 그림자 | 방향 [화면 오른쪽 -1.5, 위 2.3, 카메라 쪽 1.0], 그림자 0.62×0.48(캐릭터 키 배수), 불투명도 0.62, 색 `#100818` |
| 5 `grade` | 화면 전체 색 보정 + 안개 | 채도 0.94, 어두운 쪽 (0.93, 0.89, 1.02), 밝은 쪽 (1.03, 1.0, 0.95), 들어올림 (0.018, 0.008, 0.035), 대비 0.12, 비네트 0.16, 안개 `#69637b`, 초점 뒤 0.7~18 |

효과가 큰 순서는 외곽선, 발밑 그림자, 색 보정입니다. 색 평탄화는 셰이더 근사라 효과가 약합니다.

## 알아 둘 점

- **sam_3_3d GLB가 조명에서 어두운 이유**: 재질에 metallicFactor가 없어 glTF 기본값 1(금속)로 읽힙니다. 이 모듈은 재질을 통째로 바꾸므로 영향이 없습니다. 원래 재질을 쓸 때는 `material.metalness = 0`으로 두면 됩니다.
- **sam_3_3d 메쉬는 안쪽에 껍질이 한 겹 더 있습니다.** 외곽선을 카메라 반대쪽으로 밀지 않으면 벽에 줄무늬가 생깁니다. 깊이 버퍼가 16비트여도 같은 줄무늬가 나오니 렌더 타깃 깊이는 24비트로 두세요(three 0.187 기본값).
- sam_3_3d에는 법선이 없어서 `CartoonBuilding`이 `computeVertexNormals()`로 만듭니다.
- 밉 편향을 키우면 텍스처 아틀라스의 빈 틈(검은색)이 벽으로 번집니다. 0.6 이하로 두세요.
- 조명 세기는 three의 물리 단위 기준입니다(구버전 뷰어 값에 π를 곱한 값).
- 바닥과 캐릭터 스프라이트 재질은 건드리지 않습니다. 색 보정과 안개만 함께 받습니다. 스프라이트 재질은 `fog: true`(기본값)로 두세요.
- 모델 뷰어는 three 0.147 전역 스크립트라 같은 셰이더를 따로 들고 있습니다. 수치를 바꾸면 양쪽을 맞춰야 합니다.

## 구조 (객체지향 4특성과 SOLID)

```
settings.ts         수치 전부. 읽기 전용 값 객체
CartoonStage.ts     단계의 추상 기반 클래스 + 역할 인터페이스 3개
stages.ts           다섯 단계 (ToonShade / Outline / Flatten / Lighting / Grade)
materials.ts        BuildingMaterialFactory(추상) → Toon / Unlit, TextureFlattenPatch
outline.ts          OutlineShellFactory
shadows.ts          BlobShadowFactory
ColorGradePass.ts   후처리 패스
CartoonBuilding.ts  GLB 한 채
CartoonLook.ts      전체를 묶는 창구
```

- **캡슐화**: `CartoonBuilding`이 메쉬, 재질, 외곽선 껍질을 안에 숨기고 `useMaterials`, `setOpacity` 같은 의도만 받습니다. `CartoonStage.enabled`는 setter로만 바뀌고 바뀌면 반드시 `onEnabledChanged`가 불립니다.
- **추상화**: `CartoonStage`, `BuildingMaterialFactory`, `MaterialPatch`가 "무엇을 하는가"만 정합니다.
- **상속**: 다섯 단계가 `CartoonStage`를, `ToonMaterialFactory`와 `UnlitMaterialFactory`가 `BuildingMaterialFactory`를 잇습니다. 공통 흐름(패치 적용)은 기반 클래스의 `create`에 있고 하위 클래스는 `build`만 채웁니다.
- **다형성**: `CartoonLook`은 단계가 무엇인지 모르고 `enabled`, `adopt`, `update`, `render`만 부릅니다. `ToonShadeStage`는 켜짐 여부에 따라 팩토리만 바꿔 끼웁니다.
- **단일 책임**: 단계 하나가 처리 하나. 수치는 `settings.ts`, 셰이더 편집은 패치, 지오메트리 준비는 `OutlineShellFactory`.
- **개방-폐쇄**: 새 단계는 `CartoonStage`를 상속해 `new CartoonLook([...])`에 넣으면 됩니다. 기존 코드는 고치지 않습니다.
- **리스코프 치환**: 어떤 단계든 `CartoonStage`로, 어떤 팩토리든 `BuildingMaterialFactory`로 바꿔 넣어도 동작합니다.
- **인터페이스 분리**: `BuildingRole`, `SceneRole`, `FrameRole`로 나눠서 단계가 자기 역할만 구현합니다(`FlattenStage`는 역할이 없습니다).
- **의존성 역전**: 단계는 팩토리와 패스를 생성자로 받습니다. 조립은 `CartoonLook.createDefault` 한 곳에서만 합니다.
- **최적화**: 평탄화와 명암 띠 텍스처는 전 건물이 공유합니다. 평탄화 켜고 끄기는 유니폼 하나라 셰이더를 다시 컴파일하지 않습니다. 외곽선용 법선은 지오메트리마다 한 번만 계산합니다. 그림자는 지오메트리와 텍스처를 공유합니다.
