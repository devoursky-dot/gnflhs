// 파일 경로: app/design/formulas.ts
// [시스템 전역 표준 고정] Seoul Time (KST, UTC+9) 규격 정립

export interface FormulaExample {
  title: string;
  code: string;
  desc: string;
}

export interface FormulaCategory {
  category: string;
  iconType: 'link' | 'branch' | 'math' | 'terminal' | 'sparkles' | 'shield-check';
  color: string;
  items: FormulaExample[];
}

export const FORMULA_EXAMPLES: FormulaCategory[] = [
  {
    category: "0. 시스템 운영 규칙 (KST 표준) 🚦",
    iconType: 'shield-check',
    color: 'slate',
    items: [
      { title: "전역 시간 규격", code: "today, date, month, time, now", desc: "모든 시간 함수는 서울(KST) 시간을 기준으로 포맷팅되어 반환됩니다." },
      { title: "오늘 데이터 조회", code: "count('테이블', {컬럼: 'today'})", desc: "날짜(YYYY-MM-DD)와 타임스탬프 형식을 모두 자동 감지하여 조회합니다." },
      { title: "동적 상태 제어", code: "count(...) > 0", desc: "조건 결과가 참(true)일 때 메뉴가 비활성화되거나 숨겨집니다." },
    ]
  },
  {
    category: "1. 표준 날짜 및 시간 형식 (서울 기준) 📅",
    iconType: 'math',
    color: 'emerald',
    items: [
      { title: "오늘 (today)", code: "today", desc: "결과: 2026-04-16" },
      { title: "현재 날짜 (date)", code: "date", desc: "결과: 2026-04-16" },
      { title: "현재 년월 (month)", code: "month", desc: "결과: 2026-04" },
      { title: "현재 년도 (year)", code: "year", desc: "결과: 2026" },
      { title: "현재 시간 (time)", code: "time", desc: "결과: 14:07:07" },
      { title: "현재 전체 (now)", code: "now", desc: "결과: 2026-04-16 14:07:07" },
    ]
  },
  {
    category: "2. 조건문 (Adaptive UI 제어) 🔀",
    iconType: 'branch',
    color: 'rose',
    items: [
      { title: "데이터 존재 여부", code: "count('attendance_log', {created_date: 'today'}) > 0", desc: "오늘 기록이 하나라도 있으면 참(true)" },
      { title: "내 기록 확인", code: "count('tasks', {email: 'me'}) <= 0", desc: "내 담당 업무가 없으면 참(true)" },
      { title: "사용자 정보 활용", code: "currentUser().role === 'admin'", desc: "로그인한 사용자가 관리자일 때만 메뉴 활성화" },
    ]
  },
  {
    category: "3. 데이터 연결 및 텍스트 🔗",
    iconType: 'link',
    color: 'indigo',
    items: [
      { title: "단순 연결", code: "{{성}} + {{이름}}", desc: "결과: 홍길동" },
      { title: "구조화된 텍스트", code: "'[' + {{학번}} + '] ' + {{이름}}", desc: "결과: [10201] 홍길동" },
      { title: "공백 포함", code: "{{반}} + ' ' + {{번호}} + '번'", desc: "결과: 3 15번" },
    ]
  },
  {
    category: "4. 데이터 가공 및 정규식 ✨",
    iconType: 'sparkles',
    color: 'amber',
    items: [
      { title: "정규식 (패턴형)", code: "/(\\d{3})(\\d{4})(\\d{4})/", desc: "전화번호 마스킹 등에 사용" },
      { title: "천단위 콤마 (₩)", code: "Number(val).toLocaleString() + '원'", desc: "결과: 1,234,500원" },
      { title: "말줄임표 (...)", code: "val?.length > 10 ? val.slice(0, 10) + '...' : val", desc: "길이 초과 시 자동 생략" },
    ]
  }
];
