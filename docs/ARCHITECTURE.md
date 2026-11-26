# 코드 구조

이 저장소의 코드는 객체지향으로 구성하고, 객체지향의 네 가지 특성과 SOLID 원칙을 따릅니다.
새 코드를 더할 때도 이 문서의 방식을 지켜 주세요.

## 폴더

```
src/
  main.ts                  시작점. GameFactory로 게임을 조립해 실행한다
  core/rules.js            전투 규칙(3D 프로토타입에서 그대로 가져옴)
  data/                    바꿔 끼우는 내용: 대사, 스프라이트 표, 마을 배치, 캐릭터 수치
  game/
    Game.ts                매 프레임의 박자(진행, 카메라, 그리기)
    GameFactory.ts         객체를 만들어 서로 이어 주는 곳
    World.ts               장면에 있는 모든 것을 맡는다
    capabilities.ts        객체끼리 주고받는 약속(작은 인터페이스들)
    input.ts               키보드와 포인터 입력
    entities/              장면에 놓이는 것: Entity, Character, Hero, Building, Ground, MoveMarker
    states/                캐릭터의 행동 상태: 대기, 걷기, 공격
    control/               캐릭터를 조종하는 방법: 키보드, 클릭, 플레이어
    systems/               여러 객체에 걸친 규칙: 충돌 지도, 가림 검사
    logic/                 계산만 하는 순수 함수(방향, 충돌, 가림, 프레임)
  render/                  화면 표현: 카메라, 스프라이트, 모델 보관소
    look.ts                화면 느낌의 약속(SceneLook)과 공통 뼈대(BaseLook)
    FlatLook.ts            꾸밈 없는 화면
    CartoonSceneLook.ts    카툰 화면. cartoon 모듈을 게임의 약속에 맞춰 잇는다
    cartoon/               카툰 렌더링 모듈(명암, 외곽선, 색 평탄화, 조명, 색 보정). 수치는 settings.ts
tests/                     단위 테스트
```

## 객체지향의 네 가지 특성

### 추상화

- `Entity`는 장면에 놓이는 모든 것의 추상 클래스입니다. `World`는 건물인지 캐릭터인지 묻지 않고 `root`를 무대에 올리고 `update`만 부릅니다.
- `Character`는 걸어 다니는 캐릭터의 추상 클래스입니다. 위치, 방향, 상태 전환은 여기서 처리하고, "자세를 어떤 그림으로 보여 줄지"만 비워 둡니다.
- `capabilities.ts`의 인터페이스는 상대가 무엇인지 대신 무엇을 할 수 있는지만 말합니다. 길을 막는 것(`Obstacle`), 가리는 것(`Occluder`), 걸을 수 있는 공간(`CollisionSpace`), 동작 그림(`SpriteAnimator`) 등입니다.

### 상속

```
Entity
├─ Character (추상)
│   └─ Hero            앞·뒤 그림을 가진 주인공
├─ Building            길을 막고, 캐릭터를 가리면 옅어진다
├─ Ground              바닥
└─ MoveMarker          클릭 이동 목적지 표시

CharacterState (추상)
├─ IdleState
├─ WalkState
└─ AttackState

BaseLook (추상)
├─ FlatLook            조명과 후처리 없는 화면
└─ CartoonSceneLook    카툰 화면(기본)
```

볼프와 에다, 마을 사람, 적은 `Character`를 상속해 `clipFor`만 구현하면 됩니다.

### 다형성

- **행동 상태**: `Character`는 지금 상태의 `update`를 부를 뿐이고, 대기·걷기·공격이 각자 다르게 움직이며 다음 상태를 돌려줍니다. 피격, 시전, 쓰러짐은 상태 클래스를 더하면 됩니다.
- **조종**: `MoveSource`를 구현한 `KeyboardMove`와 `PointerMove`를 `PlayerController`가 우선순위대로 묶습니다. 길 찾기나 AI도 같은 인터페이스로 들어옵니다.
- **화면 느낌**: `SceneLook`을 구현한 `CartoonSceneLook`(기본)과 `FlatLook`을 갈아 끼웁니다. 건물은 `look.dress(model)`로 겉모습을 입고 불투명도만 알려 주며, `Game`은 `look.render(...)`에 그리기를 맡깁니다. 주소에 `?look=flat`을 붙이면 꾸밈 없는 화면으로 바뀝니다.
- **월드**: 모든 `Entity`를 한 줄로 세워 같은 `update`를 부릅니다.

### 캡슐화

- 필드는 모두 `private`이고, 밖에서 필요한 값만 읽기 전용 getter로 내놓습니다(`Character.position`, `Building.opacity`, `PointerMove.destination`).
- 상태 클래스는 `CharacterActions`라는 좁은 창구로만 캐릭터를 다룹니다. 캐릭터의 스프라이트나 충돌 공간을 직접 만지지 못합니다.
- 모델 캐시(`ModelLibrary`)와 그림자 텍스처(`FlatLook`)처럼 함께 쓰는 자원은 전역 변수가 아니라 맡은 객체 안에 둡니다.

## SOLID

| 원칙 | 적용 |
| --- | --- |
| 단일 책임 | `Game`은 박자, `World`는 등록과 진행, `CollisionMap`은 충돌, `OcclusionSystem`은 가림, `GameFactory`는 조립만 맡습니다. 불러오기(`SpriteFactory`, `ModelLibrary`)와 보여 주기(`SpriteView`, `Building`)도 나눴습니다. |
| 개방-폐쇄 | 새 물체는 `Entity`를 상속해 `world.add()`하면 끝입니다. `World`가 능력(`isObstacle`, `isOccluder`)을 보고 알맞은 곳에 등록하므로 기존 클래스를 고치지 않습니다. 새 행동은 상태 클래스, 새 조종은 `MoveSource`, 새 화면 느낌은 `SceneLook` 구현을 더합니다. |
| 리스코프 치환 | `Entity`가 필요한 곳에는 어떤 하위 클래스든, `SpriteAnimator`가 필요한 곳에는 실제 스프라이트든 테스트용 가짜든 그대로 들어갑니다. 테스트가 이것을 확인합니다. |
| 인터페이스 분리 | 입력은 `AxisInput`, `ActionInput`, `PointerInput`, `ZoomInput`으로, 화면 느낌은 `SpriteLook`, `BuildingLook`, `GroundLook`, `FrameLook`으로 나눠 쓰는 쪽이 필요한 것만 받습니다. |
| 의존성 역전 | `Character`는 `CollisionSpace`, `CharacterController`, `SpriteAnimator` 인터페이스에만 기대고, 실제 구현은 `GameFactory`가 생성자로 넣어 줍니다. 그래서 캐릭터 로직을 브라우저 없이 테스트할 수 있습니다. |

## 한 프레임의 흐름

1. `Game`이 휠 입력으로 확대·축소를 반영합니다.
2. `World.update`가 모든 `Entity.update`를 부릅니다.
   - `Hero`: 현재 상태가 조종자에게 의사를 묻고, 걷거나 공격하고, 스프라이트를 갱신합니다.
   - `Building`: 가리는 중이면 불투명도를 30%로, 아니면 100%로 조금씩 옮깁니다.
3. `OcclusionSystem`이 주인공을 가리는 건물을 찾아 알려 줍니다.
4. 카메라가 주인공을 따라가고, 화면 느낌(look)이 장면을 그립니다. 카툰 화면은 장면을 버퍼에 그린 뒤 색 보정 셰이더를 한 번 거칩니다.

## 성능을 위해 지키는 것

- 매 프레임 불리는 곳에서는 객체를 새로 만들지 않고 계산용 벡터를 다시 씁니다(`Building`, `QuarterCamera`).
- 가림 검사는 주인공이 움직였을 때만 다시 합니다. 먼저 상자로 걸러 내고, 걸린 건물만 실제 메시로 확인합니다.
- 스프라이트는 프레임이 바뀔 때만 텍스처 좌표를 다시 씁니다.
- 같은 모델 파일은 한 번만 내려받고, 그림자 텍스처는 한 장을 함께 씁니다.
- 상태 객체는 자기 데이터가 없어서 모든 캐릭터가 같은 객체를 함께 씁니다.
- 카메라 각도가 고정이라 조명 방향과 그림자 위치는 한 번만 계산합니다(`CartoonSceneLook.track`).

## 순수 함수로 남긴 것

`game/logic/`의 방향 계산, 충돌 밀어내기, 반직선과 상자의 교차, 프레임 번호 계산은 상태가 없는 수학이라 함수로 두었습니다.
클래스가 이 함수를 불러 쓰며, 입력과 출력만으로 테스트합니다.

`core/rules.js`의 전투 규칙은 3D 프로토타입의 코드를 수치 보존을 위해 그대로 옮긴 것입니다.
전투 화면을 만들 때 기존 테스트(`tests/rules.test.ts`)를 안전망으로 삼아 클래스 구조(전투원, 기술, 전투 진행)로 바꿀 예정입니다.

## 카툰 렌더링 모듈

`src/render/cartoon/`은 모델 뷰어에서 수치를 맞춘 카툰 렌더링 모듈을 그대로 가져온 것입니다(설명은 그 폴더의 README).
게임 코드는 이 모듈을 직접 부르지 않고 `CartoonSceneLook`을 거칩니다. 수치를 바꿀 때는 `cartoon/settings.ts`만 고치고,
모듈을 새 판으로 바꿀 때는 폴더를 통째로 교체합니다. 이 폴더는 원본과 비교하기 쉽도록 prettier 대상에서 뺐습니다.
