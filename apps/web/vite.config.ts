import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// sprint-5 D-S5-1 lock = (a): vite multi-entry. lecture-reader (sprint-2 prototype) 가
// root index.html 그대로, persona-turn (sprint-5) 은 별도 entry persona-turn.html.
// dev server 는 root level *.html 을 자동으로 entry 로 인식. build 는 rollupOptions.input 명시.
export default defineConfig({
  plugins: [react()],
  define: {
    // WU3 loop-gate negative control 전용 빌드타임 플래그. 평시(미설정)=false →
    // negativeControl 모듈 dead-branch tree-shake (prod 번들 영향 0). gate 만 =1 로 RED 빌드.
    __AUTH_LOOP_NEG_CTRL__: process.env.AUTH_LOOP_NEG_CTRL === "1" ? "true" : "false",
    // S3 loop-gate negative control 전용 빌드타임 플래그. 평시(미설정)=false →
    // home/intake negativeControl 모듈 dead-branch tree-shake (prod 번들 영향 0).
    __S3_LOOP_NEG_CTRL__: process.env.S3_LOOP_NEG_CTRL === "1" ? "true" : "false"
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "persona-turn": resolve(__dirname, "persona-turn.html"),
        "onboarding-mcp": resolve(__dirname, "onboarding-mcp.html"),
        admin: resolve(__dirname, "admin.html")
      }
    }
  }
});
