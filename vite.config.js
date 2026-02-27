import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    plugins: [
        basicSsl() // Génère automatiquement un certificat SSL auto-signé
    ],
    server: {
        https: true,  // Active HTTPS
        host: true,   // Expose sur le réseau local (pour Quest 3)
        port: 5173,
        hmr: {
            protocol: 'wss',
            clientPort: 5173
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                game: 'game.html'
            }
        }
    }
});
