// 파일 경로: app/design/formulas.ts
// (formulaExamples.ts에서 이름 변경. 기존 인터페이스와 데이터 100% 유지)

export interface FormulaExample {
  title: string;
  code: string;
  desc: string;
}

export interface FormulaCategory {
  category: string;
  iconType: 'link' | 'branch' | 'math' | 'terminal' | 'sparkles';
  color: string;
  items: FormulaExample[];
}

export const FORMULA_EXAMPLES: FormulaCategory[] = [
  {
    category: "1. 데이터 연결 및 텍스트 🔗",
    iconType: 'link',
    color: 'indigo',
    items: [
      { title: "단순 연결", code: "{{성}} + {{이름}}", desc: "결과: 홍길동" },
      { title: "구초화된 텍스트", code: "'[' + {{학번}} + '] ' + {{이름}}", desc: "결과: [10201] 홍길동" },
      { title: "공백 포함", code: "{{반}} + ' ' + {{번호}} + '번'", desc: "결과: 3 15번" },
    ]
  },
  {
    category: "2. 오늘 날짜 및 시간 📅",
    iconType: 'math',
    color: 'emerald',
    items: [
      { title: "현재 년도 (4자리)", code: "new Date().getFullYear()", desc: "결과: 2024" },
      { title: "현재 월 (1-12)", code: "new Date().getMonth() + 1", desc: "결과: 4" },
      { title: "현재 일 (1-31)", code: "new Date().getDate()", desc: "결과: 11" },
      { title: "표준 날짜 (YYYY-MM-DD)", code: "new Date().toISOString().split('T')[0]", desc: "결과: 2024-04-11" },
    ]
  },
  {
    category: "3. 조건문 (IF / ELSE) 🔀",
    iconType: 'branch',
    color: 'rose',
    items: [
      { title: "기본 조건 (삼항연산)", code: "val == 'Y' ? '완료' : '대기'", desc: "참이면 앞의 값, 거짓이면 뒤의 값" },
      { title: "다중 조건 (중첩)", code: "val >= 90 ? 'A' : (val >= 80 ? 'B' : 'C')", desc: "학점 판단 로직" },
      { title: "공백 체크", code: "!val ? '내용없음' : val", desc: "비어있을 때 기본값 설정" },
    ]
  },
  {
    category: "4. 실무형 데이터 가공 ✨",
    iconType: 'sparkles',
    color: 'amber',
    items: [
      { title: "천단위 콤마 (₩)", code: "Number(val).toLocaleString() + '원'", desc: "결과: 1,234,500원" },
      { title: "날짜 형식 (한국식)", code: "new Date(val).toLocaleDateString()", desc: "결과: 2024. 4. 11." },
      { title: "전화번호 하이픈", code: "String(val).replace(/(\\d{3})(\\d{4})(\\d{4})/, '$1-$2-$3')", desc: "01012345678 -> 010-1234-5678" },
      { title: "글자 수 제한 (...)", code: "val?.length > 10 ? val.slice(0, 10) + '...' : val", desc: "넘치면 말줄임표 처리" },
      { title: "마스킹 (정보보호)", code: "val ? val.slice(0, 1) + '*'.repeat(val.length - 2) + val.slice(-1) : val", desc: "홍길동 -> 홍*동" },
    ]
  }
];
