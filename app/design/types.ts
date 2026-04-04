// 파일 경로: app/design/types.ts

export type AppState = {
  id: number | null;
  name: string;
  icon?: string | null;
  views: View[];
  actions: Action[];
};

export type View = {
  id: string;
  name: string;
  icon?: string | null;
  tableName: string | null;
  // --- [신규] 1단계 서버 필터 설정을 위한 속성 ---
  filterColumn?: string | null;  
  filterOperator?: 'eq' | 'neq' | 'like' | 'gt' | 'lt'; 
  filterValue?: string | null;   
  // ------------------------------------------
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
  valueType?: 'string' | 'number';
};

export type Action = {
  id: string;
  name: string;
  icon?: string | null;
  type: 'navigate' | 'alert' | 'link' | 'insert_row';
  targetViewId: string | null;
  message: string | null;
  insertTableName?: string | null;
  insertMappings?: InsertMapping[];
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
};

export type SchemaData = Record<string, string[]>;