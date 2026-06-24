import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'

// Load ALL env vars (incl. non-VITE backend keys) into process.env so the
// in-process password-reset API can read DB/SMTP config from the single .env.
dotenv.config()

/**
 * Runs the standalone password-reset API (server/src) inside the Vite dev
 * server, on the same origin — so there's one package, one .env, one command.
 * Registered before Vite's SPA fallback; non-/api/auth requests fall through.
 */
function passwordResetApi() {
  return {
    name: 'password-reset-api',
    async configureServer(server: any) {
      const { default: express } = await import('express')
      const authRouter = (await import('./server/src/routes/auth.js')).default
      const usersRouter = (await import('./server/src/routes/users.js')).default
      const app = express()
      app.use(express.json())
      app.use('/api/auth', authRouter)
      app.use('/api/users', usersRouter)
      server.middlewares.use(app)
    },
  }
}

export default defineConfig({
  plugins: [react(), passwordResetApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
