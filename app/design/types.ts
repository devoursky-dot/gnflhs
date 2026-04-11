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
  navPosition?: 'both' | 'bottom' | 'menu' | 'hidden';
  
  filterColumn?: string | null;  
  filterOperator?: 'eq' | 'neq' | 'like' | 'gt' | 'lt'; 
  filterValue?: string | null;   
  
  sortColumn?: string | null;    
  sortDirection?: 'asc' | 'desc';
  
  groupByColumn?: string | null; 
  
  // 🔥 [출석부 다중선택 잠금 기능]
  isLocked?: boolean;
  lockedKeyColumn?: string | null;
  lockedRecordKeys?: string[];
  
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
  textExpression?: string; // 🔥 [신규] 마법의 수식 (JS 방식)
  
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
  
  // 🔥 [신규] 프롬프트 입력 고도화 옵션
  defaultNumberValue?: number; // 숫자형 기본값
  numberStep?: number;         // 숫자형 증감 단위
  promptOptions?: string;      // 문자형 버튼 옵션 (콤마 구분)
  allowCustomPrompt?: boolean; // 기타 직접 입력 허용 여부
  isExpression?: boolean;      // 🔥 수식 모드 여부
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
  confirmationMessage?: string | null;
  smsTableName?: string | null;
  smsPhoneColumn?: string | null;
  smsMessageTemplate?: string | null;
  tableName?: string | null; // 🔥 [신규] 소스 데이터 테이블 (카드 데이터 출처)
};

export type SchemaData = Record<string, string[]>;