const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../middleware.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export default ', 'const middleware = ')
  .replace('export const config', 'const config');
function middleware(userId) {
  const context = { process: { env: { CLERK_SECRET_KEY: 'test-only' } }, module: { exports: {} },
    clerkMiddleware: handler => req => handler(async () => ({ userId }), req),
    NextResponse: { next: () => ({ status: 200 }), json: (body, init) => ({ body, ...init }) },
  };
  vm.runInNewContext(source + '\nmodule.exports = middleware;', context);
  return pathname => context.module.exports({ nextUrl: { pathname } });
}
test('signed-out paid APIs return 401 without redirecting to HTML', async () => {
  for (const route of ['tony', 'voice', 'tts', 'stt', 'resume', 'twin-voice', 'group', 'portrait']) {
    assert.equal((await middleware(null)('/api/' + route)).status, 401);
  }
});
test('signed-in paid API requests continue to ownership checks', async () => {
  assert.equal((await middleware('user_test')('/api/tony')).status, 200);
});
test('sign-in, second-factor, callback and public pages stay reachable', async () => {
  for (const route of ['/sign-in', '/sign-in/factor-two', '/sign-in/sso-callback', '/sign-up', '/landing', '/api/health']) {
    assert.equal((await middleware(null)(route)).status, 200);
  }
});
