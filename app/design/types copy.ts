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
  layoutRows: LayoutRow[];
};

export type LayoutRow = {
  id: string;
  cells: LayoutCell[];
};

export type LayoutCell = {
  id: string;
  flex: number; // 너비 비율
  contentType: 'empty' | 'field' | 'action';
  contentValue: string | null; // 칼럼명 또는 action id
  icon?: string;
};

export type Action = {
  id: string;
  name: string;
  type: 'navigate' | 'alert' | 'link';
  targetViewId: string | null; // navigate일 경우 이동할 뷰 ID
  message: string | null; // alert일 경우 메시지
};

export type SchemaData = Record<string, string[]>;