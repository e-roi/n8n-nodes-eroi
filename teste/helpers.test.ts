// Unit tests of the pure helpers (no network, no n8n runtime): npm test.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { compact, customFieldsToObject, dateOnly, EVENTS, marketingOptIn, signatureIsValid, stageName, tagBody, webhookItem } from '../nodes/Eroi/helpers';

describe('helpers', () => {
	it('compact drops blank values and empty objects', () => {
		assert.deepEqual(compact({ a: 'x', b: '', c: undefined, d: null, e: {}, f: 0, g: false }), { a: 'x', f: 0, g: false });
	});

	it('custom fields from the fixed collection', () => {
		assert.deepEqual(customFieldsToObject({ field: [{ key: 'cpf', value: '1' }, { key: '', value: 'x' }, { key: 'vazio', value: '' }] }), { cpf: '1' });
		assert.equal(customFieldsToObject({}), undefined);
	});

	it('tag by id or by name', () => {
		assert.deepEqual(tagBody('0b6f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4'), { tag_id: '0b6f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4' });
		assert.deepEqual(tagBody(' Evento 2026 '), { tag_name: 'Evento 2026' });
	});

	it('date only', () => {
		assert.equal(dateOnly('2026-12-01T03:00:00.000Z'), '2026-12-01');
		assert.equal(dateOnly('2026-12-01'), '2026-12-01');
		assert.equal(dateOnly(''), undefined);
	});

	it('stage name shows the pipeline when none was chosen', () => {
		assert.equal(stageName({ name: 'Negociação', pipeline_name: 'Vendas' }, false), 'Vendas › Negociação');
		assert.equal(stageName({ name: 'Negociação', pipeline_name: 'Vendas' }, true), 'Negociação');
	});

	it('webhook item: the record plus the event id', () => {
		assert.deepEqual(webhookItem({ id: 'd1', event_type: 'opportunity.won', event_id: 'ev1', data: { id: 'o1', title: 'Plano' } }), {
			id: 'o1',
			title: 'Plano',
			event_type: 'opportunity.won',
			event_id: 'ev1',
			test: false,
		});
	});

	it('signature check (HMAC-SHA256 of "<timestamp>.<raw body>", within 5 minutes)', () => {
		const body = JSON.stringify({ id: 'd1', event_type: 'contact.created', data: { id: 'c1' } });
		const ts = '1762430400';
		const now = Number(ts) * 1000;
		const good = 'sha256=' + createHmac('sha256', 'segredo').update(`${ts}.${body}`).digest('hex');
		assert.equal(signatureIsValid('segredo', body, good, ts, now), true);
		assert.equal(signatureIsValid('segredo', Buffer.from(body), good, ts, now + 299_000), true);
		assert.equal(signatureIsValid('segredo', body, good, ts, now + 301_000), false, 'old delivery (replay)');
		assert.equal(signatureIsValid('segredo', body, good, '1762430401', now), false, 'other timestamp');
		assert.equal(signatureIsValid('segredo', body + ' ', good, ts, now), false);
		assert.equal(signatureIsValid('outro', body, good, ts, now), false);
		assert.equal(signatureIsValid('segredo', body, undefined, ts, now), false);
		assert.equal(signatureIsValid('segredo', body, good, undefined, now), false);
		// The old format (body only) no longer passes.
		assert.equal(signatureIsValid('segredo', body, 'sha256=' + createHmac('sha256', 'segredo').update(body).digest('hex'), ts, now), false);
	});

	it('marketing emails: accepted is true, unsubscribed is false, anything else is not sent', () => {
		assert.equal(marketingOptIn('accepted'), true);
		assert.equal(marketingOptIn('unsubscribed'), false);
		assert.equal(marketingOptIn(undefined), undefined);
		assert.equal(marketingOptIn(false), undefined);
		assert.equal(marketingOptIn(''), undefined);
	});

	it('the 11 e-roi events, sorted by name, without dashes', () => {
		assert.equal(EVENTS.length, 11);
		const names = EVENTS.map((e) => e.name);
		assert.deepEqual(names, [...names].sort());
		for (const e of EVENTS) assert.doesNotMatch(e.description, /—/);
	});
});
