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
    __S3_LOOP_NEG_CTRL__: process.env.S3_LOOP_NEG_CTRL === "1" ? "true" : "false",
    // S3b loop-gate negative control 플래그 (A=mount-loop, B=click-loop).
    // 평시 false → negativeControlSidebar 모듈 dead-branch tree-shake.
    __S3B_LOOP_NEG_CTRL_A__: process.env.S3B_LOOP_NEG_CTRL_A === "1" ? "true" : "false",
    __S3B_LOOP_NEG_CTRL_B__: process.env.S3B_LOOP_NEG_CTRL_B === "1" ? "true" : "false",
    // S4a loop-gate negative control 플래그 (A=mount-loop, B=click-loop).
    // 평시 false → negativeControlSubject 모듈 dead-branch tree-shake.
    __S4A_LOOP_NEG_CTRL_A__: process.env.S4A_LOOP_NEG_CTRL_A === "1" ? "true" : "false",
    __S4A_LOOP_NEG_CTRL_B__: process.env.S4A_LOOP_NEG_CTRL_B === "1" ? "true" : "false",
    // S4b-1 loop-gate negative control 플래그 (A=mount-loop, B=click-loop).
    // 평시 false → negativeControlWeek 모듈 dead-branch tree-shake.
    __S4B_LOOP_NEG_CTRL_A__: process.env.S4B_LOOP_NEG_CTRL_A === "1" ? "true" : "false",
    __S4B_LOOP_NEG_CTRL_B__: process.env.S4B_LOOP_NEG_CTRL_B === "1" ? "true" : "false",
    // S4b-2 loop-gate negative control 플래그 (A=mount-loop, B=click-loop).
    // 평시 false → negativeControlSubjectClass 모듈 dead-branch tree-shake.
    __S4B2_LOOP_NEG_CTRL_A__: process.env.S4B2_LOOP_NEG_CTRL_A === "1" ? "true" : "false",
    __S4B2_LOOP_NEG_CTRL_B__: process.env.S4B2_LOOP_NEG_CTRL_B === "1" ? "true" : "false",
    // S4c loop-gate negative control 플래그 (A=mount-loop, B=click-loop).
    // 평시 false → negativeControlPdfWorkspaces 모듈 dead-branch tree-shake.
    __S4C_LOOP_NEG_CTRL_A__: process.env.S4C_LOOP_NEG_CTRL_A === "1" ? "true" : "false",
    __S4C_LOOP_NEG_CTRL_B__: process.env.S4C_LOOP_NEG_CTRL_B === "1" ? "true" : "false"
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
