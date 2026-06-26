const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

function waitForServer(url, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeout) {
            reject(new Error('timed out waiting for server'));
          } else {
            setTimeout(attempt, 100);
          }
        });
    };
    attempt();
  });
}

test('serves the portal HTML at the root URL', async () => {
  const server = spawn(process.execPath, ['auth-server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3101' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer('http://127.0.0.1:3101/');
    const res = await fetch('http://127.0.0.1:3101/');
    const text = await res.text();
    assert.match(text, /Geoportal/);
    assert.equal(res.status, 200);
  } finally {
    server.kill('SIGTERM');
  }
});

test('auth endpoint accepts the admin credentials', async () => {
  const server = spawn(process.execPath, ['auth-server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3102' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer('http://127.0.0.1:3102/');
    const res = await fetch('http://127.0.0.1:3102/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'admin', password: 'Geoportal2026' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.role, 'Administrador');
  } finally {
    server.kill('SIGTERM');
  }
});
