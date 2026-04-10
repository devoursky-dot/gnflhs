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
  
  filterColumn?: string | null;  
  filterOperator?: 'eq' | 'neq' | 'like' | 'gt' | 'lt'; 
  filterValue?: string | null;   
  
  sortColumn?: string | null;    
  sortDirection?: 'asc' | 'desc';
  
  groupByColumn?: string | null; 
  
  cardHeight: number;
  columnCount: number;
  layoutRows: LayoutRow[];
  onClickActionId?: string | null;
};

export type LayoutRow = {
  id: string;
  type?: 'row';
  flex?: number;
  cells: LayoutCell[];
};

export type LayoutCell = {
  id: string;
  flex: number; 
  contentType: 'empty' | 'field' | 'action' | 'nested';
  contentValue: string | null;
  
  isImage?: boolean; 
  imageShape?: 'square' | 'rounded' | 'circle';
  
  textSize?: string;
  textWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  
  textRegexPattern?: string;
  textRegexReplace?: string;
  textPrefix?: string;
  textSuffix?: string;
  
  // 🔥 [신규] 액션 버튼 스타일링 속성
  buttonShape?: 'square' | 'rounded' | 'pill';
  buttonAlign?: 'full' | 'left' | 'center' | 'right';
  buttonStyle?: 'text' | 'icon' | 'both';
  
  nestedRows?: LayoutRow[]; 
};

export type InsertMapping = {
  id: string;
  targetColumn: string;
  mappingType: 'card_data' | 'static' | 'prompt' | 'user_name' | 'user_email';
  sourceValue: string;
  valueType?: 'string' | 'number';
};

export type Action = {
  id: string;
  name: string;
  icon?: string | null;
  type: 'navigate' | 'alert' | 'link' | 'insert_row' | 'delete_row' | 'update_row' | 'send_sms';
  targetViewId: string | null;
  message: string | null;
  insertTableName?: string | null;
  insertMappings?: InsertMapping[];
  deleteTableName?: string | null;
  updateTableName?: string | null;
  updateMappings?: InsertMapping[];
  requireConfirmation?: boolean;
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
  smsTableName?: string | null;
  smsPhoneColumn?: string | null;
  smsMessageTemplate?: string | null;
};

export type SchemaData = Record<string, string[]>;