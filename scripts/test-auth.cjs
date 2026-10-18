const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../middleware.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export default ', 'const middleware = ')
  .replace('export const config', 'const config');
function middleware(userId, configured = true) {
  const context = { process: { env: configured ? { CLERK_SECRET_KEY: 'test-only' } : {} }, module: { exports: {} },
    clerkMiddleware: handler => req => handler(async () => ({ userId }), req),
    NextResponse: { next: () => ({ status: 200 }), json: (body, init) => ({ body, ...init }) },
  };
  vm.runInNewContext(source + '\nmodule.exports = middleware;', context);
  return pathname => context.module.exports({ nextUrl: { pathname } });
}
test('signed-out paid APIs return 401 without redirecting to HTML', async () => {
  for (const route of ['tony', 'voice', 'tts', 'stt', 'resume', 'twin-voice', 'group', 'portrait', 'twin-studio']) {
    assert.equal((await middleware(null)('/api/' + route)).status, 401);
  }
});
test('missing Clerk configuration fails closed for paid APIs while public pages render', async () => {
  assert.equal((await middleware(null, false)('/api/tony')).status, 503);
  assert.equal((await middleware(null, false)('/api/twin-studio')).status, 503);
  assert.equal((await middleware(null, false)('/landing')).status, 200);
});
test('signed-in paid API requests continue to ownership checks', async () => {
  assert.equal((await middleware('user_test')('/api/tony')).status, 200);
});
test('sign-in, second-factor, callback and public pages stay reachable', async () => {
  for (const route of ['/sign-in', '/sign-in/factor-two', '/sign-in/sso-callback', '/sign-up', '/landing', '/api/health']) {
    assert.equal((await middleware(null)(route)).status, 200);
  }
});

test('automatic-reply owner JWT requests run Clerk while pairing tokens reach device authentication', async () => {
  let clerkCalls = 0;
  const context = { process: { env: { CLERK_SECRET_KEY: 'test-only' } }, module: { exports: {} },
    clerkMiddleware: handler => req => { clerkCalls++; return handler(async () => ({ userId: 'user_test' }), req); },
    NextResponse: { next: () => ({ status: 200 }), json: (body, init) => ({ body, ...init }) },
  };
  vm.runInNewContext(source + '\nmodule.exports = middleware;', context);
  const request = token => context.module.exports({ nextUrl: { pathname: '/api/meeting-auto' }, headers: { get: () => token } });
  await request('Bearer eyJheader.eyJpayload.signature');
  assert.equal(clerkCalls, 1, 'browser JWT must initialize owner authentication');
  await request('Bearer dXNlcl90ZXN0.' + 'a'.repeat(64));
  assert.equal(clerkCalls, 1, 'pairing token is authenticated by the endpoint');
  await request('Bearer malformed');
  await request(null);
  assert.equal(clerkCalls, 3, 'other requests must not bypass Clerk');
});
