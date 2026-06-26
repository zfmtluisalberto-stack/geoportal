const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 3001;
const authFile = path.join(__dirname, 'auth-users.json');
let users = {};

if (fs.existsSync(authFile)) {
  try {
    users = JSON.parse(fs.readFileSync(authFile, 'utf8')).users || {};
  } catch (err) {
    users = {};
  }
}

function verifyPassword(password, storedUser) {
  if (!storedUser || !storedUser.hash || !storedUser.salt) return false;
  const hash = crypto.pbkdf2Sync(password, storedUser.salt, 100000, 64, 'sha512').toString('hex');
  return hash === storedUser.hash;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { ok: false, message: 'No encontrado' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'POST' && pathname === '/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const user = users[data.user];
        const ok = user && verifyPassword(data.password, user);
        if (ok) {
          sendJson(res, 200, { ok: true, role: user.role });
        } else {
          sendJson(res, 401, { ok: false, message: 'Credenciales inválidas' });
        }
      } catch (err) {
        sendJson(res, 400, { ok: false, message: 'Solicitud inválida' });
      }
    });
    return;
  }

  if (pathname === '/') {
    sendFile(res, path.join(__dirname, 'index.html'), mimeTypes['.html']);
    return;
  }

  const safePath = pathname === '/' ? '/' : pathname.replace(/^\/+/, '');
  const fullPath = path.join(__dirname, safePath);
  const ext = path.extname(fullPath).toLowerCase();

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    sendFile(res, fullPath, mimeTypes[ext] || 'application/octet-stream');
    return;
  }

  sendJson(res, 404, { ok: false, message: 'No encontrado' });
});

server.listen(port, () => {
  console.log('Auth server listening on port ' + port);
});
