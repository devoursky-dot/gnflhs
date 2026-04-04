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
  
  // 1단계 서버 필터 속성
  filterColumn?: string | null;  
  filterOperator?: 'eq' | 'neq' | 'like' | 'gt' | 'lt'; 
  filterValue?: string | null;   
  
  // 서버 정렬 속성
  sortColumn?: string | null;    
  sortDirection?: 'asc' | 'desc';
  
  // 🔥 [신규] 데이터를 묶어서 보여줄 그룹핑 기준 칼럼
  groupByColumn?: string | null; 
  
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

// [누락 방지] 인서트(데이터 추가) 시 필요한 맵핑 세부 규칙 전체 유지
export type InsertMapping = {
  id: string;
  targetColumn: string;
  mappingType: 'card_data' | 'static' | 'prompt';
  sourceValue: string;
  valueType?: 'string' | 'number';
};

// [누락 방지] 액션(기능) 세부 규칙 전체 유지
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