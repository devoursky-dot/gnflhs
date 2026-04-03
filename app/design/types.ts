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
  mappingType: 'card_data' | 'static' | 'prompt'; // [추가] prompt: 팝업으로 입력받기
  sourceValue: string;
};

export type Action = {
  id: string;
  name: string;
  type: 'navigate' | 'alert' | 'link' | 'insert_row';
  targetViewId: string | null;
  message: string | null;
  
  // 데이터 추가 액션을 위한 속성
  insertTableName?: string | null;
  insertMappings?: InsertMapping[];
  
  // [신규 추가] 액션 실행 전 확인 여부
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
};

export type SchemaData = Record<string, string[]>;