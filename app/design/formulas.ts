// 파일 경로: app/design/formulas.ts
// [시스템 전역 표준 고정] Seoul Time (KST, UTC+9) 규격 정립

export interface FormulaExample {
  title: string;
  code: string;
  desc: string;
}

export interface FormulaCategory {
  category: string;
  iconType: 'link' | 'branch' | 'math' | 'terminal' | 'sparkles' | 'database' | 'shield-check';
  color: string;
  items: FormulaExample[];
}

export const FORMULA_EXAMPLES: FormulaCategory[] = [
  {
    category: "0. 🛡️ 시스템 운영 규칙 (KST 표준)",
    iconType: 'shield-check',
    color: 'slate',
    items: [
      { title: "전역 시간 규격", code: "today, date, month, time, now", desc: "모든 시간 함수는 서울(KST) 시간을 기준으로 반환됩니다." },
      { title: "오늘 데이터 조회", code: "count('테이블', {컬럼: 'today'})", desc: "날짜와 타임스탬프를 자동 감지하여 오늘 데이터를 조회합니다." },
      { title: "동적 상태 제어", code: "count(...) > 0", desc: "조건 결과에 따라 메뉴가 비활성화되거나 숨겨집니다." },
    ]
  },
  {
    category: "1. 💾 데이터 필터링 및 비교 (Filtering)",
    iconType: 'database',
    color: 'indigo',
    items: [
      { title: "오늘 데이터만 보기", code: "isToday({{date_column}})", desc: "날짜 컬럼의 데이터가 오늘인지 확인합니다." },
      { title: "복합 상태 필터링", code: "['완료', '진행중'].includes({{status}})", desc: "상태가 완료이거나 진행중인 데이터만 표시합니다." },
      { title: "수치 범위 필터", code: "{{score}} >= 80 && {{score}} <= 100", desc: "점수가 80점 이상 100점 이하인 행만 필터링합니다." },
      { title: "데이터 존재 여부", code: "{{remark}} !== null && {{remark}} !== ''", desc: "비고란에 내용이 있는 데이터만 모아봅니다." },
      { title: "문자열 검색", code: "{{title}}.includes('공지')", desc: "제목에 '공지'라는 단어가 포함된 데이터만 찾습니다." },
      { title: "본인 데이터만(내 문서)", code: "{{created_by}} === currentUser().email", desc: "현재 로그인한 사용자가 작성한 데이터만 필터링합니다." },
    ]
  },
  {
    category: "2. 📅 날짜 및 시간 처리 (Dates)",
    iconType: 'math',
    color: 'emerald',
    items: [
      { title: "이번 달 데이터", code: "{{created_at}}.startsWith(month)", desc: "작성일이 이번 달(YYYY-MM)인 데이터만 필터링합니다." },
      { title: "올해 데이터", code: "{{created_at}}.startsWith(year)", desc: "작성일이 올해(YYYY)인 데이터만 필터링합니다." },
      { title: "D-Day 계산", code: "Math.floor((new Date({{due_date}}) - new Date(today)) / (1000*60*60*24))", desc: "오늘 기준 마감일까지 남은 일수를 계산합니다." },
      { title: "한국식 날짜 출력", code: "new Date({{date}}).toLocaleDateString('ko-KR')", desc: "결과: 2024년 4월 17일" },
    ]
  },
  {
    category: "3. 🔀 조건부 텍스트 가공 (Conditional)",
    iconType: 'branch',
    color: 'rose',
    items: [
      { title: "상태별 텍스트 출력", code: "{{status}} === 'Y' ? '🟢 완료' : '🔴 대기'", desc: "값에 따라 다른 텍스트와 이모지를 결합합니다." },
      { title: "다중 조건 (A/B/C)", code: "{{score}} >= 90 ? '⭐⭐⭐' : ({{score}} >= 70 ? '⭐⭐' : '⭐')", desc: "비즈니스 등급 로직을 구현합니다." },
      { title: "기본값 처리", code: "{{name}} || '이름 없음'", desc: "데이터가 없을 때 기본적으로 보여줄 텍스트를 지정합니다." },
    ]
  },
  {
    category: "4. 🧩 텍스트 및 숫자 변환 (Utilities)",
    iconType: 'terminal',
    color: 'amber',
    items: [
      { title: "천단위 콤마 추가", code: "Number({{price}}).toLocaleString() + '원'", desc: "결과: 1,500,000원" },
      { title: "전화번호 마스킹", code: "{{phone}}.replace(/(\\d{3})(\\d{4})(\\d{4})/, '$1-****-$3')", desc: "결과: 010-****-5678" },
      { title: "말줄임 처리(길이 제한)", code: "{{content}}.length > 20 ? {{content}}.slice(0, 20) + '...' : {{content}}", desc: "내용이 너무 길면 자르고 '...'을 붙입니다." },
    ]
  },
  {
    category: "5. ✨ 핵심 헬퍼 변수 (Built-in)",
    iconType: 'sparkles',
    color: 'cyan',
    items: [
      { title: "today / now / month", code: "today", desc: "오늘 날짜(YYYY-MM-DD), 현재일시, 현재년월 자동 변수" },
      { title: "isToday(date)", code: "isToday({{col}})", desc: "특정 날짜값이 오늘인지 판별하는 필수 함수" },
      { title: "currentUser()", code: "currentUser().email", desc: "로그인 유저 정보 접근 (email, name)" },
    ]
  }
];
