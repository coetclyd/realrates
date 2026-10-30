import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirectTarget, parseHosts } from '../lib/host-redirect.js';

const base = { primaryHost: 'www.shiftrates.co.uk', legacyHosts: 'realrates.vercel.app' };

test('off when PRIMARY_HOST is not set', () => {
  assert.equal(legacyRedirectTarget({ host: 'realrates.vercel.app', pathname: '/', legacyHosts: 'realrates.vercel.app' }), null);
});

test('old address redirects to the same path and query on the new one', () => {
  assert.equal(
    legacyRedirectTarget({ ...base, host: 'realrates.vercel.app', pathname: '/region/yorkshire-humber', search: '?utm_source=poster' }),
    'https://www.shiftrates.co.uk/region/yorkshire-humber?utm_source=poster',
  );
});

test('host matching ignores case and port', () => {
  assert.equal(legacyRedirectTarget({ ...base, host: 'RealRates.Vercel.App:443', pathname: '/calculator' }), 'https://www.shiftrates.co.uk/calculator');
});

test('primary host is served normally', () => {
  assert.equal(legacyRedirectTarget({ ...base, host: 'www.shiftrates.co.uk', pathname: '/' }), null);
});

test('unlisted hosts (previews, deployment URLs) are served normally', () => {
  assert.equal(legacyRedirectTarget({ ...base, host: 'realrates-git-main-sentinel-pro-s-projects.vercel.app', pathname: '/' }), null);
});

test('sign-in routes on the old address are never redirected', () => {
  for (const pathname of ['/auth/finish', '/auth/callback', '/auth/confirm', '/auth/provider/google', '/auth']) {
    assert.equal(legacyRedirectTarget({ ...base, host: 'realrates.vercel.app', pathname }), null, pathname);
  }
});

test('API routes are never redirected', () => {
  assert.equal(legacyRedirectTarget({ ...base, host: 'realrates.vercel.app', pathname: '/api/track' }), null);
});

test('only GET and HEAD are redirected', () => {
  assert.equal(legacyRedirectTarget({ ...base, method: 'POST', host: 'realrates.vercel.app', pathname: '/submit' }), null);
  assert.equal(legacyRedirectTarget({ ...base, method: 'HEAD', host: 'realrates.vercel.app', pathname: '/' }), 'https://www.shiftrates.co.uk/');
});

test('a path merely starting with "auth" is still redirected', () => {
  assert.equal(legacyRedirectTarget({ ...base, host: 'realrates.vercel.app', pathname: '/authors' }), 'https://www.shiftrates.co.uk/authors');
});

test('legacy host list accepts several hosts', () => {
  assert.deepEqual(parseHosts(' realrates.vercel.app , Example.com:8080 ,'), ['realrates.vercel.app', 'example.com']);
});
