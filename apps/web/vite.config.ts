import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// sprint-5 D-S5-1 lock = (a): vite multi-entry. lecture-reader (sprint-2 prototype) 가
// root index.html 그대로, persona-turn (sprint-5) 은 별도 entry persona-turn.html.
// dev server 는 root level *.html 을 자동으로 entry 로 인식. build 는 rollupOptions.input 명시.
export default defineConfig({
  plugins: [react()],
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
