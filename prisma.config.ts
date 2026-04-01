// prisma.config.ts
import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: 'file:./dev.db', // 여기에 DB 경로를 적어줍니다.
  },
});