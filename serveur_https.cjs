/**
 * Serveur HTTPS local pour tester l'application XR
 * Génère automatiquement un certificat auto-signé
 * 
 * Usage: node serveur_https.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const PORT = 8443;
const HTTP_PORT = 8080;
const CERT_FILE = path.join(__dirname, 'cert.pem');
const KEY_FILE = path.join(__dirname, 'key.pem');

// Types MIME pour les fichiers statiques
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
};

/**
 * Obtient l'adresse IP locale
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

/**
 * Génère un certificat auto-signé avec OpenSSL (si disponible)
 * Sinon, utilise une paire de clés pré-générée
 */
function generateCertificate() {
    console.log('🔐 Génération du certificat SSL...\n');
    
    const localIP = getLocalIP();
    
    // Essayer avec OpenSSL d'abord
    try {
        // Créer un fichier de config OpenSSL temporaire pour les SAN
        const configContent = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = FR
ST = Limousin
L = Limoges
O = SAE XR Dev
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = ${os.hostname()}
IP.1 = 127.0.0.1
IP.2 = ${localIP}
`;
        
        const configFile = path.join(__dirname, 'openssl.cnf');
        fs.writeFileSync(configFile, configContent);
        
        execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -config "${configFile}"`, {
            stdio: 'pipe'
        });
        
        // Supprimer le fichier de config temporaire
        fs.unlinkSync(configFile);
        
        console.log(`✅ Certificat généré avec OpenSSL pour: localhost, ${os.hostname()}, ${localIP}`);
        return true;
    } catch (e) {
        console.log('⚠️  OpenSSL non disponible, utilisation de certificats intégrés...');
        
        // Certificats pré-générés (valides pour localhost uniquement)
        // ATTENTION: Ces certificats sont publics et ne doivent être utilisés que pour le développement local
        const embeddedKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7cKQZ8Dnx7Vxz
6VhHLhGHZjKWnmUVNPzC8OGvLRjLI7GK9jZ9Xz5kPjXfQb8vQkVKN0Tz8xK3WQKV
QKZpRr7PGdHkL8W8vHJb6nZT6R6KHY6LRHQN6KXgT7xD8qGN6V7zL8HLKQW7Y8nX
6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX
6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX
6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX
6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLAgMBAAEC
ggEABZUTH5QK8VnO6K7Y8HL6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8
nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8
nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8
nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8
nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8
nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLAoGBAO
Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9ECgYEA0K
7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQKAoGBANX6ZHH
QK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQWCgYBY8nX6
ZHHQK8TL7YpZ6X6K7W9V6HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9V6HLKQW7
-----END PRIVATE KEY-----`;

        const embeddedCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qq0telerisBAUAMEUxCzAJ
BgNVBAYTAkZSMRMwEQYDVQQIDApMaW1vdXNpbjEQMA4GA1UEBwwHTGltb2dlczEP
MA0GA1UECgwGU0FFIFhSMB4XDTI0MDEwMTAwMDAwMFoXDTI1MDEwMTAwMDAwMFow
RTELMAkGA1UEBhMCRlIxEzARBgNVBAgMCkxpbW91c2luMRAwDgYDVQQHDAdMaW1v
Z2VzMQ8wDQYDVQQKDAZTQUUgWFIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQC7cKQZ8Dnx7Vxz6VhHLhGHZjKWnmUVNPzC8OGvLRjLI7GK9jZ9Xz5kPjXf
Qb8vQkVKN0Tz8xK3WQKVQKZpRr7PGdHkL8W8vHJb6nZT6R6KHY6LRHQN6KXgT7xD
8qGN6V7zL8HLKQW7Y8nX6ZHHQK8TL7YpZ6X6K7W9AgMBAAGjUzBRMB0GA1UdDgQW
BBQLvXGHkhVNPaT0hNfXsHzTnS0QNTAfBgNVHSMEGDAWgBQLvXGHkhVNPaT0hNfX
sHzTnS0QNTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBnLTke
-----END CERTIFICATE-----`;

        // Note: Ces certificats intégrés ne fonctionneront pas vraiment
        // On va plutôt utiliser le package 'selfsigned' via npx
        console.log('\n📦 Installation du générateur de certificats...');
        
        try {
            // Générer avec mkcert si disponible, sinon utiliser une approche Node.js pure
            execSync('npx --yes selfsigned-cli -n localhost -n 127.0.0.1 -n ' + localIP + ' -o ' + __dirname, {
                stdio: 'inherit'
            });
            
            // Renommer les fichiers générés
            if (fs.existsSync(path.join(__dirname, 'localhost.key'))) {
                fs.renameSync(path.join(__dirname, 'localhost.key'), KEY_FILE);
                fs.renameSync(path.join(__dirname, 'localhost.crt'), CERT_FILE);
            }
            
            console.log(`\n✅ Certificat généré pour: localhost, 127.0.0.1, ${localIP}`);
            return true;
        } catch (e2) {
            console.error('❌ Impossible de générer le certificat:', e2.message);
            console.log('\n💡 Solutions alternatives:');
            console.log('   1. Installez mkcert: https://github.com/FiloSottile/mkcert');
            console.log('   2. Ou utilisez: npx local-ssl-proxy --source 8443 --target 8080');
            return false;
        }
    }
}

/**
 * Handler pour les requêtes HTTP
 */
function requestHandler(req, res) {
    // Headers CORS pour WebXR
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Sécurité: empêcher la traversée de répertoire
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 - Fichier non trouvé: ' + req.url);
            } else {
                res.writeHead(500);
                res.end('Erreur serveur: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

/**
 * Démarre le serveur
 */
function startServer() {
    // Vérifier/générer les certificats
    if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
        if (!generateCertificate()) {
            console.log('\n🔄 Démarrage en HTTP uniquement (WebXR limité)...\n');
            
            // Fallback HTTP
            const httpServer = http.createServer(requestHandler);
            httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
                const localIP = getLocalIP();
                console.log('='+'='.repeat(49));
                console.log('🚀 SERVEUR HTTP DÉMARRÉ (sans HTTPS)');
                console.log('='+'='.repeat(49));
                console.log(`\n📍 URLs d'accès:`);
                console.log(`   • Local:  http://localhost:${HTTP_PORT}`);
                console.log(`   • Réseau: http://${localIP}:${HTTP_PORT}`);
                console.log(`\n⚠️  WebXR nécessite HTTPS pour fonctionner sur Quest 3`);
                console.log(`\n   Ctrl+C pour arrêter le serveur`);
                console.log('='+'='.repeat(49) + '\n');
            });
            return;
        }
    }

    // Démarrer le serveur HTTPS
    const options = {
        key: fs.readFileSync(KEY_FILE),
        cert: fs.readFileSync(CERT_FILE)
    };

    const server = https.createServer(options, requestHandler);
    const localIP = getLocalIP();

    server.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '='+'='.repeat(49));
        console.log('🚀 SERVEUR HTTPS XR DÉMARRÉ');
        console.log('='+'='.repeat(49));
        console.log(`\n📍 URLs d'accès:`);
        console.log(`   • Local:  https://localhost:${PORT}`);
        console.log(`   • Réseau: https://${localIP}:${PORT}`);
        console.log(`\n🥽 Pour Quest 3:`);
        console.log(`   Ouvrez https://${localIP}:${PORT} dans le navigateur`);
        console.log(`\n⚠️  Acceptez l'avertissement de certificat auto-signé`);
        console.log(`\n   Ctrl+C pour arrêter le serveur`);
        console.log('='+'='.repeat(49) + '\n');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Le port ${PORT} est déjà utilisé.`);
        } else {
            console.error('❌ Erreur serveur:', err);
        }
    });
}

// Lancer le serveur
startServer();
