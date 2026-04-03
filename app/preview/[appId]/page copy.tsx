// types.ts
export type AppState = {
  id: number | null;
  name: string;
  views: View[];
  actions: Action[];
};

export type View = {
  id: string;
  name: string;
  tableName: string | null;
  layoutRows: LayoutRow[];
};

export type LayoutRow = {
  id: string;
  type: 'row';
  cells: LayoutCell[];
};

export type LayoutCell = {
  id: string;
  flex: number;
  contentType: 'empty' | 'field' | 'action' | 'nested';
  contentValue: string | null;
  isImage?: boolean; // [업그레이드] 이미지 여부 체크 속성 추가
  nestedRows?: LayoutRow[];
};

export type Action = {
  id: string;
  name: string;
  type: 'navigate' | 'alert' | 'link';
  targetViewId: string | null;
  message: string | null;
};

export type SchemaData = Record<string, string[]>;