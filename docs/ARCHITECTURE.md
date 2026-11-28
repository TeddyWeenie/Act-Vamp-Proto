# 코드 구조

이 저장소의 코드는 객체지향으로 구성하고, 객체지향의 네 가지 특성과 SOLID 원칙을 따릅니다.
새 코드를 더할 때도 이 문서의 방식을 지켜 주세요.

## 폴더

```
src/
  main.ts                  시작점. 화면(DOM)과 이야기를 만들어 GameFactory에 넘기고 게임을 실행한다
  battle/                  전투 규칙: Combatant(아군 PartyMember, 적 Enemy), Command(기술), Battle(한 판의 진행), Supplies
  story/                   이야기의 수치와 진행: Campaign(일행, 물자, 단계), Conversation(대화 한 묶음)
  core/rules.js            3D 프로토타입의 전투 규칙 원본. 새 클래스와 결과가 같은지 견주는 기준으로 남겨 둔다
  data/                    바꿔 끼우는 내용: 대사, 스프라이트 표, 마을 배치, 캐릭터 수치, 전투 구성, 장면 배치
  game/
    Game.ts                매 프레임의 박자(진행, 카메라, 그리기)
    GameFactory.ts         객체를 만들어 서로 이어 주는 곳
    World.ts               장면에 있는 모든 것을 맡는다
    Sequence.ts            여러 가지를 순서대로 진행시킨다(이야기 → 월드)
    capabilities.ts        객체끼리 주고받는 약속(작은 인터페이스들)
    input.ts               키보드와 포인터 입력
    entities/              장면에 놓이는 것: Entity, Character, CardinalHero, StandIn, Building, Prop, Ground, BattleGround
    states/                캐릭터의 행동 상태: 대기, 걷기, 공격
    control/               캐릭터를 조종하는 방법: 키보드, 클릭, 플레이어, 연출(Scripted), 갈아 끼우기(Switch), 따라 걷기(Trail, Escort)
    systems/               여러 객체에 걸친 규칙: 충돌 지도, 가림 검사, 카메라 초점
    staging/               카메라 구도와 그에 딸린 그림·배치의 묶음: Staging, QuarterStaging, TopStaging
    story/                 이야기 진행: StoryDirector, 장면(TalkScene, ResultScene), 자리(Hotspot), 화면 약속(screens), 제1장 조립(Chapter1Story)
    battle/                그 자리 전투의 연출: BattleScene, BattleActor(아군·적), Arena
    logic/                 계산만 하는 순수 함수(방향, 충돌, 가림, 프레임, 그림자 모양, 전투 대형)
  render/                  화면 표현: 카메라, 스프라이트, 모델 보관소, 임시 그림(Placeholder*)
    look.ts                화면 느낌의 약속(SceneLook)과 공통 뼈대(BaseLook)
    FlatLook.ts            기본 화면. 테두리 선 없이 텍스처 색을 그대로 쓴다(종이 오리기 화풍)
    InkLook.ts             비교용(?look=ink). 기본 화면에 건물 테두리 선만 더한다
    CartoonSceneLook.ts    카툰 화면. cartoon 모듈을 게임의 약속에 맞춰 잇는다
    cartoon/               카툰 렌더링 모듈(명암, 외곽선, 색 평탄화, 조명, 색 보정). 수치는 settings.ts
  ui/                      HTML로 그리는 화면: 대화창, 전투 화면, 결과 카드, 할 일, 말 걸기 안내
tests/                     단위 테스트
```

## 객체지향의 네 가지 특성

### 추상화

- `Entity`는 장면에 놓이는 모든 것의 추상 클래스입니다. `World`는 건물인지 캐릭터인지 묻지 않고 `root`를 무대에 올리고 `update`만 부릅니다.
- `Character`는 걸어 다니는 캐릭터의 추상 클래스입니다. 위치, 방향, 상태 전환은 여기서 처리하고, "자세를 어떤 그림으로 보여 줄지"만 비워 둡니다.
- `capabilities.ts`의 인터페이스는 상대가 무엇인지 대신 무엇을 할 수 있는지만 말합니다. 길을 막는 것(`Obstacle`), 딛고 올라설 것(`Raised`), 가리는 것(`Occluder`), 걸을 수 있는 공간(`CollisionSpace`)과 바닥 높이(`Terrain`), 동작 그림(`SpriteAnimator`) 등입니다.

### 상속

```
Entity
├─ Character (추상)
│   ├─ CardinalHero    앞·뒤·왼쪽·오른쪽 그림을 가진 주인공(기본)
│   ├─ StandIn         자세 하나에 그림 하나를 쓰는 인물(임시 그림으로 선 동료와 적)
│   └─ Hero            앞·뒤 3/4 그림을 뒤집어 쓰는 주인공(예전 쿼터뷰, 비교용)
├─ Building            벽은 길을 막고 계단은 밟고 올라서게 하며, 캐릭터를 가리면 옅어진다. 정면에 따로 그린 조각(문, 꽃 상자, 등불)을 단다
├─ Prop                세워 놓는 그림 한 장(나무, 울타리, 지금은 오린과 동력로도)
├─ Ground              바닥
├─ BattleGround        전투가 벌어지는 자리의 바닥에 깔리는 어두운 타원
└─ MoveMarker          클릭 이동 목적지 표시

Combatant (추상)       생명력, 배리어, 행동 게이지, 방어 자세
├─ PartyMember         마력, 능력치, 장비, 성장, 가진 명령
└─ Enemy               공격력, 민첩

Command (추상)         차례가 온 아군이 고르는 행동
├─ BasicAttack, PiercingDrain(관통), BarrierBreak(파쇄), Overload(전체 공격)
└─ RallyBarrier, Mend(수복), Guard, Potion

BattleActor (추상)     전투 수치와 장면 속의 몸을 잇는다
├─ AllyActor           쓰러지면 눕고, 회복되면 일어난다
└─ FoeActor            쓰러지면 사라진다

CharacterState (추상)
├─ IdleState
├─ WalkState
└─ AttackState

BaseLook (추상)
├─ FlatLook            조명과 후처리 없는 화면(기본)
│  └─ InkLook          건물 테두리 선을 더한 화면(비교용)
└─ CartoonSceneLook    카툰 화면(비교용)
```

볼프와 에다, 적은 지금 `StandIn`과 임시 그림으로 서 있습니다. 진짜 그림이 오면 `SpriteAnimator`를 구현한 `SpriteView`로 바꿔 끼우고,
방향별 그림이 생기면 `Character`를 상속해 `clipFor`만 구현하면 됩니다.

### 다형성

- **행동 상태**: `Character`는 지금 상태의 `update`를 부를 뿐이고, 대기·걷기·공격이 각자 다르게 움직이며 다음 상태를 돌려줍니다. 피격, 시전, 쓰러짐은 상태 클래스를 더하면 됩니다.
- **조종**: `MoveSource`를 구현한 `KeyboardMove`와 `PointerMove`를 `PlayerController`가 우선순위대로 묶습니다. 길 찾기나 AI도 같은 인터페이스로 들어옵니다.
- **화면 느낌**: `SceneLook`을 구현한 `FlatLook`(기본. 선 없이 텍스처 색 그대로), `InkLook`(`FlatLook`을 이어받아 건물 테두리 선만 더함, `?look=ink`), `CartoonSceneLook`(비교용)을 갈아 끼웁니다. 기본 화면은 고른 화면 느낌을 `AtmosphereLook`으로 감싸 빛 효과를 덧입히고(`?air=off`로 끔), 이 조립은 `src/main.ts`에서만 합니다. 건물은 `look.dress(model)`로 겉모습을 입고 불투명도만 알려 주며, `Game`은 `look.render(...)`에 그리기를 맡깁니다. 주소에 `?look=cartoon`을 붙이면 카툰 화면으로 바뀝니다.
- **카메라 구도**: `Staging`을 구현한 `TopStaging`(기본, 비스듬한 탑뷰 50도)과 `QuarterStaging`(예전 45도 쿼터뷰, 비교용)을 갈아 끼웁니다. 구도마다 카메라 각도, 보는 거리, 그 각도에 맞게 그린 주인공, 보기 좋은 마을 배치가 함께 바뀌므로 한 묶음으로 둡니다. 주소에 `?view=quarter`를 붙이면 쿼터뷰로 바뀝니다.
- **방향 정하기**: `FacingRule`을 구현한 `DiagonalFacing`(앞 3/4·뒤 3/4 두 그림)과 `CardinalFacing`(앞·뒤·왼쪽·오른쪽 네 그림)을 캐릭터가 넘겨받아 씁니다. 그림 이름을 고르는 일은 `Hero`와 `CardinalHero`가 각자 `clipFor`로 맡습니다.
- **월드**: 모든 `Entity`를 한 줄로 세워 같은 `update`를 부릅니다.
- **전투 명령**: `Battle`은 차례가 온 아군이 가진 `Command`의 `perform`을 부를 뿐이고, 관통인지 파쇄인지 수복인지는 각 명령 클래스가 처리합니다. 새 기술은 클래스를 더하고 `data/party.ts`의 목록에 넣습니다.
- **이야기 장면**: `StoryDirector`는 `StoryScene`의 `begin`, `update`, `next`만 부릅니다. 대화(`TalkScene`), 전투(`BattleScene`), 결과(`ResultScene`)가 각자 다르게 진행하고 다음 장면을 정합니다.
- **화면**: 장면은 `screens.ts`의 약속(`DialogueScreen`, `BattleScreen` 등)에만 기대고, 실제 화면은 `src/ui/`의 HTML 구현이 맡습니다. 테스트는 가짜 화면을 끼워 브라우저 없이 전투 장면을 끝까지 돌립니다.
- **쓰러진 모습**: `BattleActor.refresh`를 아군(`AllyActor`)은 눕는 것으로, 적(`FoeActor`)은 사라지는 것으로 구현합니다.

### 캡슐화

- 필드는 모두 `private`이고, 밖에서 필요한 값만 읽기 전용 getter로 내놓습니다(`Character.position`, `Building.opacity`, `PointerMove.destination`).
- 상태 클래스는 `CharacterActions`라는 좁은 창구로만 캐릭터를 다룹니다. 캐릭터의 스프라이트나 충돌 공간을 직접 만지지 못합니다.
- 전투 수치(`Combatant`의 생명력, 배리어, 행동 게이지)는 밖에서 직접 고치지 못하고 `takeDamage`, `heal`, `charge` 같은 행동으로만 바뀝니다. 전투에서 지면 `Campaign.save()`로 떠 둔 상태를 `load()`로 되돌립니다.
- 대화가 어디까지 왔는지는 `Conversation`만 알고, 대화창(`DialogueView`)은 그것을 그리기만 합니다.
- 캐릭터는 "왼쪽을 본다"는 사실만 스프라이트에 알립니다(`SpriteAnimator.faceLeft`). 그림이 원래 어느 쪽을 보고 그려졌는지(`SpriteClip.faces`)와 실제로 뒤집을지는 `SpriteView`만 압니다. 그림을 다시 그려 방향이 바뀌어도 표의 값 하나만 고치면 됩니다.
- 모델 캐시(`ModelLibrary`), 그림 캐시(`TextureLibrary`), 그림자 텍스처(`FlatLook`)처럼 함께 쓰는 자원은 전역 변수가 아니라 맡은 객체 안에 둡니다.

## SOLID

| 원칙 | 적용 |
| --- | --- |
| 단일 책임 | `Game`은 박자, `World`는 등록과 진행, `CollisionMap`은 충돌, `OcclusionSystem`은 가림, `GameFactory`는 조립만 맡습니다. 불러오기(`SpriteFactory`, `ModelLibrary`)와 보여 주기(`SpriteView`, `Building`)도 나눴습니다. 전투는 규칙(`Battle`), 연출의 박자(`BattleScene`), 싸움터 꾸미기(`Arena`), 화면 표시(`BattleView`)를 서로 다른 클래스가 맡습니다. |
| 개방-폐쇄 | 새 물체는 `Entity`를 상속해 `world.add()`하면 끝입니다. `World`가 능력(`isObstacle`, `isRaised`, `isOccluder`)을 보고 알맞은 곳에 등록하므로 기존 클래스를 고치지 않습니다. 새 행동은 상태 클래스, 새 조종은 `MoveSource`, 새 화면 느낌은 `SceneLook` 구현을 더합니다. 새 기술은 `Command`, 새 장면은 `StoryScene`, 새로 말을 걸 사람이나 조우는 `Hotspot`, 새 장(章)은 `Story` 구현을 더하고, `Battle`과 `StoryDirector`는 고치지 않습니다. |
| 리스코프 치환 | `Entity`가 필요한 곳에는 어떤 하위 클래스든, `SpriteAnimator`가 필요한 곳에는 실제 스프라이트든 테스트용 가짜든 그대로 들어갑니다. 테스트가 이것을 확인합니다. |
| 인터페이스 분리 | 입력은 `AxisInput`, `ActionInput`, `InteractInput`, `PointerInput`, `ZoomInput`으로, 이야기 화면은 `DialogueScreen`, `BattleScreen`, `ResultScreen`, `PromptScreen`, `QuestScreen`으로, 화면 느낌은 `SpriteLook`, `BuildingLook`, `GroundLook`, `FrameLook`으로 나눠 쓰는 쪽이 필요한 것만 받습니다. |
| 의존성 역전 | `Character`는 `CollisionSpace`, `CharacterController`, `SpriteAnimator` 인터페이스에만 기대고, 실제 구현은 `GameFactory`가 생성자로 넣어 줍니다. 그래서 캐릭터 로직을 브라우저 없이 테스트할 수 있습니다. 이야기도 같습니다. `Chapter1Story`는 화면 약속과 `StoryKit`을 넘겨받고, 어떤 화면 구현을 쓸지는 `main.ts`만 정합니다. |

## 한 프레임의 흐름

1. `Game`이 휠 입력으로 확대·축소를 반영합니다.
2. 이야기(`StoryDirector`)가 먼저 돕니다.
   - 탐색 중이면 주인공 가까이의 자리(`Hotspot`)를 살펴 안내를 띄우거나 장면을 엽니다.
   - 장면 중이면 그 장면을 진행시키고, 끝나면 다음 장면으로 넘기거나 탐색으로 돌아갑니다. 장면 중에는 주인공의 조종이 연출(`ScriptedController`)로 넘어가 있습니다.
   - `Escort`가 주인공이 지나온 길을 기록해 동료가 따라 걷게 합니다.
3. `World.update`가 모든 `Entity.update`를 부릅니다.
   - 캐릭터(주인공, 동료, 적): 현재 상태가 조종자에게 의사를 묻고, 걷거나 공격하고, 스프라이트를 갱신합니다.
   - `Building`과 `Prop`: 가리는 중이면 옅어지고, 아니면 조금씩 돌아옵니다.
4. `OcclusionSystem`이 주인공, 동료, 적 가운데 누구라도 가리는 건물과 소품을 찾아 알려 줍니다.
5. 카메라가 초점(`CameraFocus`: 보통은 주인공, 전투 중에는 대형의 가운데)을 따라가고, 화면 느낌(look)이 장면을 그립니다.

## 그 자리에서 벌어지는 전투

전투는 화면을 바꾸지 않고 걷던 자리에서 벌어집니다. `BattleScene`이 시작되면 다음 순서로 진행합니다.

1. `Campaign.save()`로 지금 상태를 떠 두고 `Campaign.engage()`로 전투(`Battle`)를 엽니다.
2. 주인공과 적 무리의 가운데에서 가장 가까운 빈자리를 `findClearFormation`으로 찾습니다. 모든 자리가 `CollisionMap.isClear`를 통과해야 하므로, 건물·소품·계단과 겹치는 대형은 고르지 않습니다.
3. 모두 자기 자리로 걸어갑니다(`GoTo`). 길이 막혀 못 닿은 사람은 정해진 시간이 지나면 자리로 바로 옮깁니다.
4. `Arena`가 바닥에 어두운 타원을 깔고 카메라를 대형에 모읍니다. 위아래 검은 띠는 전투 화면(`BattleView`)이 답니다.
5. `Battle.tick`과 `Battle.act`가 내놓는 일(`BattleEvent`)을 연출 토막으로 바꿔 차례로 보여 줍니다. 연출이 도는 동안에는 규칙의 시간을 흘리지 않습니다.
6. 이기면 `Campaign.claim`으로 보상을 받고, 지면 떠 둔 상태로 되돌린 뒤 다시 도전합니다.

대형의 방향은 `FormationShape.axis`로 정합니다. 기본은 아군이 왼쪽, 적이 오른쪽이고, 주소에 `?formation=ranks`를 붙이면 아군이 아래, 적이 위에 섭니다.

## 성능을 위해 지키는 것

- 매 프레임 불리는 곳에서는 객체를 새로 만들지 않고 계산용 벡터를 다시 씁니다(`Building`, `QuarterCamera`).
- 가림 검사는 주인공이 움직였을 때만 다시 합니다. 몸 가운데와 좌우 끝을 살피되, 먼저 상자로 걸러 내고 걸린 건물만 실제 메시로 확인합니다.
- 바닥 높이는 건물의 겉 상자 안에 들어섰을 때만 메시에 선을 쏘아 잽니다.
- 스프라이트는 프레임이 바뀔 때만 텍스처 좌표를 다시 씁니다.
- 같은 모델 파일은 한 번만 내려받고, 그림자 텍스처는 한 장을 함께 씁니다.
- 상태 객체는 자기 데이터가 없어서 모든 캐릭터가 같은 객체를 함께 씁니다.
- 카메라 각도가 고정이라 조명 방향과 그림자 위치는 한 번만 계산합니다(`CartoonSceneLook.track`).
- 건물이 땅에 드리우는 그림자의 모양은 `logic/shadow.ts`의 순수 함수가 계산하고, 건물을 만들 때 한 번만 도형으로 만듭니다.

## 순수 함수로 남긴 것

`game/logic/`의 방향 계산, 충돌 밀어내기, 반직선과 상자의 교차, 프레임 번호 계산은 상태가 없는 수학이라 함수로 두었습니다.
클래스가 이 함수를 불러 쓰며, 입력과 출력만으로 테스트합니다.

`core/rules.js`는 3D 프로토타입의 전투 규칙 원본입니다. 게임은 이제 `src/battle/`의 클래스를 쓰고,
`tests/battle.test.ts`가 옛 규칙과 새 클래스를 같은 입력으로 한 걸음씩 돌려 결과가 같은지 확인합니다.
강화, 휴식, 저장처럼 아직 옮기지 않은 부분을 2단계에서 옮기고 나면 원본은 지웁니다.

## 임시 그림

기능을 먼저 만들고 그림은 나중에 입히기 위해, 그림이 없는 인물과 물건은 `render/Placeholder*`가 캔버스에 그린 임시 그림으로 섭니다.
이름표에 "임시"라고 적혀 있고, 생김새는 `data/chapter1Scene.ts`의 `figure`가 정합니다.
진짜 그림이 준비되면 그 자리의 `figure`를 그림 파일로 바꾸고, 모두 바꾼 뒤에는 `Placeholder*` 파일을 지웁니다.

## 카툰 렌더링 모듈

`src/render/cartoon/`은 모델 뷰어에서 수치를 맞춘 카툰 렌더링 모듈을 그대로 가져온 것입니다(설명은 그 폴더의 README).
게임 코드는 이 모듈을 직접 부르지 않고 `CartoonSceneLook`을 거칩니다. 수치를 바꿀 때는 `cartoon/settings.ts`만 고치고,
모듈을 새 판으로 바꿀 때는 폴더를 통째로 교체합니다. 이 폴더는 원본과 비교하기 쉽도록 prettier 대상에서 뺐습니다.
