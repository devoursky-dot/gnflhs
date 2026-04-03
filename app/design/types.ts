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
  cardHeight: number;
  columnCount: number;
  layoutRows: LayoutRow[];
  onClickActionId?: string | null; // [신규] 카드 전체 클릭 시 실행될 액션 ID
};

export type LayoutRow = {
  id: string;
  cells: LayoutCell[];
};

export type LayoutCell = {
  id: string;
  flex: number; 
  contentType: 'empty' | 'field' | 'action' | 'nested';
  contentValue: string | null;
  isImage?: boolean; 
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