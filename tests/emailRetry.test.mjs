import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/sync/emailRetry.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { emailRetrySeconds } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('uses the actual Supabase remaining seconds instead of a fixed cooldown', () => {
  for (const seconds of [37, 1, 0, 120]) {
    assert.equal(emailRetrySeconds(new Headers(), {
      code: 'over_email_send_rate_limit',
      msg: `For security purposes, you can only request this after ${seconds} seconds.`,
    }), seconds)
  }
})

test('prefers Retry-After and supports HTTP dates', () => {
  assert.equal(emailRetrySeconds(new Headers({ 'Retry-After': '12' }), {
    msg: 'Please try after 37 seconds.',
  }), 12)
  const now = Date.parse('2026-09-09T12:00:00Z')
  assert.equal(emailRetrySeconds(new Headers({ 'Retry-After': 'Wed, 09 Sep 2026 12:00:23 GMT' }), {}, now), 23)
  assert.equal(emailRetrySeconds(new Headers({ 'Retry-After': 'Wed, 09 Sep 2026 11:00:00 GMT' }), {}, now), 0)
})

test('falls back from an invalid header and does not invent a wait for other errors', () => {
  assert.equal(emailRetrySeconds(new Headers({ 'Retry-After': 'invalid' }), {
    message: 'For security purposes, you can only request this after 9 seconds.',
  }), 9)
  for (const body of [null, {}, { msg: 'Email delivery failed' }, { msg: 60 }]) {
    assert.equal(emailRetrySeconds(new Headers(), body), 0)
  }
})
