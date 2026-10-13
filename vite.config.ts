import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 하위 경로 배포. 누락 시 빈 화면
export default defineConfig({
  base: '/doc-rule-checker/',
  plugins: [react(), tailwindcss()],
})
