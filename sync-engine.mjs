import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── 환경 설정 ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'app', 'preview', '[appId]');
const VERSION = process.argv[2] || 'v1'; // 실행 시 인자가 없으면 기본 v1
const TARGET_DIR = path.join(ROOT, 'app', 'engines', VERSION);

const FILES_TO_SYNC = [
  'renderer.tsx',
  'utils.ts',
  'modals.tsx',
  'types.ts'
];

async function sync() {
  console.log(`\n🚀 [엔진 동기화 시작] : ${VERSION} 버전으로 복사를 시작합니다...`);

  // 1. 대상 폴더 존재 확인 및 생성
  if (!fs.existsSync(TARGET_DIR)) {
    console.log(`📁 폴더가 없어 생성합니다: ${TARGET_DIR}`);
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  for (const fileName of FILES_TO_SYNC) {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const targetPath = path.join(TARGET_DIR, fileName);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️ 경고: 소스 파일이 없습니다. 건너뜁니다: ${fileName}`);
      continue;
    }

    try {
      // 파일 읽기
      let content = fs.readFileSync(sourcePath, 'utf8');

      // 2. [핵심] 임포트 경로 자동 보정 (코드가 꼬이지 않게 하는 비결)
      if (fileName !== 'types.ts') {
        const originalImport = /from ['"]@\/app\/design\/types['"]/g;
        const newImport = "from './types'";
        
        if (originalImport.test(content)) {
          content = content.replace(originalImport, newImport);
          console.log(`🔗 ${fileName}: 임포트 경로를 엔진 내부용으로 수정했습니다.`);
        }
      }

      // 3. 파일 쓰기
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`✅ 성공: ${fileName} -> ${TARGET_DIR}`);

    } catch (err) {
      console.error(`❌ 에러 발생 (${fileName}):`, err.message);
    }
  }

  // 4. 버전 정보 파일 업데이트 (빌더 동기화용)
  const versionFilePath = path.join(ROOT, 'app', 'engines', 'version.ts');
  const versionFileContent = `export const CURRENT_ENGINE_VERSION = '${VERSION}';\n`;
  fs.writeFileSync(versionFilePath, versionFileContent, 'utf8');
  console.log(`📌 빌더 엔진 버전을 ${VERSION}으로 업데이트했습니다.`);

  console.log(`\n✨ [동기화 완료] 이제 빌더에서 SYNCED 배지를 확인하세요!\n`);
}

sync();
