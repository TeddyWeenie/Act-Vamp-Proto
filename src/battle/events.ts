/** 전투에서 일어난 일. 화면은 이것을 받아 연출과 숫자를 보여 준다. */
export type BattleEvent =
  | { readonly type: 'ready'; readonly actor: string }
  | {
      readonly type: 'hit';
      readonly actor: string;
      readonly target: string;
      readonly hp: number;
      readonly bp: number;
      readonly broken: boolean;
    }
  | { readonly type: 'heal'; readonly target: string; readonly text: string }
  | { readonly type: 'victory' }
  | { readonly type: 'defeat' };
