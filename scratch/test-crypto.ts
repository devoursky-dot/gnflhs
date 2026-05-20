import { encryptSession, decryptSession } from '../app/cryptoHelper';

async function runTest() {
  console.log("=== 🔐 쿠키 암호화/복호화 자체 테스트 ===");
  
  const mockSession = {
    id: "teacher_admin",
    email: "admin@school.com",
    type: "teacher"
  };
  
  console.log("\n1. 원본 세션 데이터 (평문 JSON):");
  console.log(JSON.stringify(mockSession, null, 2));
  
  try {
    // 암호화 진행
    const encrypted = await encryptSession(mockSession);
    console.log("\n2. 암호화된 쿠키 값 (Base64 AES-GCM):");
    console.log(encrypted);
    
    // 복호화 진행
    const decrypted = await decryptSession(encrypted);
    console.log("\n3. 다시 복호화한 데이터:");
    console.log(JSON.stringify(decrypted, null, 2));
    
    // 변조 테스트
    console.log("\n4. 쿠키 변조(위조) 차단 테스트:");
    const tampered = encrypted.substring(0, encrypted.length - 5) + "AAAAA";
    console.log("변조된 쿠키 값:", tampered);
    const tamperedDecrypted = await decryptSession(tampered);
    console.log("변조된 쿠키 복호화 결과 (실패 시 null):", tamperedDecrypted);
    
  } catch (error) {
    console.error("테스트 중 오류 발생:", error);
  }
}

runTest();
