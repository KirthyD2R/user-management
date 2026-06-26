import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function passwordResetApi() {
  return {
    name: 'password-reset-api',
    async configureServer(server: any) {
      const { default: express } = await import('express');
      const serverRoot = path.resolve(__dirname, '../../server/src/routes');
      const authUrl = pathToFileURL(path.join(serverRoot, 'auth.js')).href;
      const usersUrl = pathToFileURL(path.join(serverRoot, 'users.js')).href;
      const authRouter = (await import(/* @vite-ignore */ authUrl)).default;
      const usersRouter = (await import(/* @vite-ignore */ usersUrl)).default;
      const app = express();
      app.use(express.json());
      app.use('/api/auth', authRouter);
      app.use('/api/users', usersRouter);
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [react(), passwordResetApi()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  css: {
    postcss: path.resolve(__dirname, '../../postcss.config.js'),
  },
});
