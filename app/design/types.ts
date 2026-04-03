// types.ts
export type AppState = {
  id: number | null;
  name: string;
  icon?: string | null; // [신규] 앱 아이콘
  views: View[];
  actions: Action[];
};

export type View = {
  id: string;
  name: string;
  icon?: string | null; // [신규] 뷰 아이콘
  tableName: string | null;
  cardHeight: number;
  columnCount: number;
  layoutRows: LayoutRow[];
  onClickActionId?: string | null;
};

export type LayoutRow = {
  id: string;
  type?: 'row';
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

export type InsertMapping = {
  id: string;
  targetColumn: string;
  mappingType: 'card_data' | 'static' | 'prompt';
  sourceValue: string;
};

export type Action = {
  id: string;
  name: string;
  icon?: string | null; // [신규] 액션 아이콘
  type: 'navigate' | 'alert' | 'link' | 'insert_row';
  targetViewId: string | null;
  message: string | null;
  insertTableName?: string | null;
  insertMappings?: InsertMapping[];
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
};

export type SchemaData = Record<string, string[]>;