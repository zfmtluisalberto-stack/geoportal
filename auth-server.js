const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'POST' && req.url === '/login') {
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

  sendJson(res, 404, { ok: false, message: 'No encontrado' });
});

server.listen(port, () => {
  console.log('Auth server listening on port ' + port);
});
