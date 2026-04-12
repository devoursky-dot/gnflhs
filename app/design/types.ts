// 파일 경로: app/design/types.ts

export type GroupAggregation = {
  id: string;
  type: 'count' | 'sum' | 'avg' | 'count_if';
  column?: string;
  conditionValue?: string;
  label: string;
  color?: string;
};

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
  filterOperator?: 'eq' | 'neq' | 'like' | 'contains' | 'starts' | 'ends' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'is_null' | 'is_not_null'; 
  filterValue?: string | null;   
  
  sortColumn?: string | null;    
  sortDirection?: 'asc' | 'desc';
  
  groupByColumn?: string | null; 
  groupHeaderIcon?: string | null;
  groupHeaderAlign?: 'left' | 'center' | 'right';
  groupHeaderColor?: string | null;
  groupHeaderTextSize?: string;
  groupHeaderExpression?: string; // 🔥 [신규] 그룹 헤더 수식 (가공용)
  groupAggregations?: GroupAggregation[]; // 🔥 [신규] 통계 정보
  groupAggregationPosition?: 'beside_label' | 'right_end'; // 🔥 [신규] 통계 표시 위치
  
  // 🔥 [출석부 다중선택 잠금 기능]
  isLocked?: boolean;
  lockedKeyColumn?: string | null;
  lockedRecordKeys?: string[];
  
  cardHeight: number;
  columnCount: number;
  layoutRows: LayoutRow[];
  onClickActionId?: string | null;
  onInitActionId?: string | null; // 🔥 [신규] 뷰 시작 시 자동 실행 액션
  
  // 🔥 [신규] 어댑티브 메뉴 제어 (노출 조건 및 상태)
  visibilityExpr?: string;        // 노출/활성화 조건 (JS Expression)
  visibilityBehavior?: 'hide' | 'disable'; // 조건 만족 시 동작 (숨김 또는 비활성화)
  disabledLabel?: string;         // 비활성화 시 표시할 문구
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
  buttonShape?: 'square' | 'rounded' | 'pill' | 'none';
  buttonAlign?: 'full' | 'left' | 'center' | 'right';
  buttonStyle?: 'text' | 'icon' | 'both';
  buttonVariant?: 'default' | 'raised' | 'inset' | 'outline' | '3d' | 'shadow' | 'glass';
  buttonColor?: string;
  textColor?: string;
  
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
  batchMode?: boolean; // 🔥 [신규] 다중 데이터 일괄 처리 모드
};

export type SchemaData = Record<string, string[]>;