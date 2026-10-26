import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bound to all interfaces so a phone on the same Wi-Fi can scan booking QR codes.
  server: { host: true, port: 5180, strictPort: true },
})
