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
  
  // 서버 그룹화 속성
  groupByColumn?: string | null; 
  
  cardHeight: number;
  columnCount: number;
  layoutRows: LayoutRow[];
  onClickActionId?: string | null;
};

export type LayoutRow = {
  id: string;
  type?: 'row';
  flex?: number; // 🔥 [신규] 세로(행) 높이 비율을 제어하는 속성 추가
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
  type: 'navigate' | 'alert' | 'link' | 'insert_row' | 'delete_row' | 'update_row';
  targetViewId: string | null;
  message: string | null;
  
  // 데이터 추가(Insert)
  insertTableName?: string | null;
  insertMappings?: InsertMapping[];
  
  // 데이터 삭제(Delete) 설정
  deleteTableName?: string | null;
  
  // 데이터 수정(Update) 설정
  updateTableName?: string | null;
  updateMappings?: InsertMapping[];
  
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
};

export type SchemaData = Record<string, string[]>;