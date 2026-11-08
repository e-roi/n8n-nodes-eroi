// Pure helpers shared by the e-roi nodes (no n8n imports: unit tested in teste/).

import { createHmac, timingSafeEqual } from 'crypto';

export const DEFAULT_BASE_URL = 'https://api.eroimkt.com.br/v1/api/v1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Plain = Record<string, unknown>;

/** Drops empty values (n8n sends "" for blank optional fields). */
export function compact(input: Plain): Plain {
	const output: Plain = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null || value === '') continue;
		if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Plain).length === 0) continue;
		output[key] = value;
	}
	return output;
}

/** Custom fields from the fixed collection ({ field: [{ key, value }] }) to the API object. */
export function customFieldsToObject(collection: unknown): Plain | undefined {
	const rows = (collection as { field?: Array<{ key?: string; value?: unknown }> } | undefined)?.field ?? [];
	const output: Plain = {};
	for (const row of rows) {
		if (row && typeof row.key === 'string' && row.key && row.value !== undefined && row.value !== '') {
			output[row.key] = row.value;
		}
	}
	return Object.keys(output).length ? output : undefined;
}

/** Tag picked from the list (id) or typed (name: created in e-roi when missing). */
export function tagBody(value: unknown): { tag_id: string } | { tag_name: string } {
	const text = String(value ?? '').trim();
	return UUID.test(text) ? { tag_id: text } : { tag_name: text };
}

/** Date-only string (YYYY-MM-DD) from what n8n sends (date or date-time). */
export function dateOnly(value: unknown): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const text = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
}

/** Stage option name: with the pipeline when no pipeline was chosen. */
export function stageName(stage: { name: string; pipeline_name?: string }, pipelineChosen: boolean): string {
	return pipelineChosen || !stage.pipeline_name ? stage.name : `${stage.pipeline_name} › ${stage.name}`;
}

/** The e-roi webhook body ({ event_type, event_id, created_at, data }) as the workflow item. */
export function webhookItem(body: unknown): Plain {
	const envelope = (body && typeof body === 'object' ? body : {}) as Plain;
	const data = envelope.data && typeof envelope.data === 'object' ? (envelope.data as Plain) : envelope;
	return {
		...data,
		event_type: envelope.event_type ?? null,
		event_id: envelope.event_id ?? envelope.id ?? null,
		test: envelope.test === true,
	};
}

/** How far (seconds) the X-Eroi-Timestamp of a delivery may be from the clock of n8n. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * X-Eroi-Signature: "sha256=" + HMAC-SHA256, with the subscription secret, of
 * "<X-Eroi-Timestamp>.<raw body>". The timestamp must be within 5 minutes of
 * now, so a captured delivery cannot be replayed later.
 */
export function signatureIsValid(
	secret: string,
	rawBody: string | Buffer,
	header: unknown,
	timestamp: unknown,
	nowMs: number = Date.now(),
	toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): boolean {
	if (!secret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
	const ts = typeof timestamp === 'string' ? timestamp.trim() : '';
	if (!/^\d{1,12}$/.test(ts)) return false;
	if (Math.abs(nowMs / 1000 - Number(ts)) > toleranceSeconds) return false;
	const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
	const expected = createHmac('sha256', secret).update(Buffer.concat([Buffer.from(`${ts}.`, 'utf8'), body])).digest('hex');
	const received = header.slice('sha256='.length);
	if (received.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

/**
 * Marketing emails option of the node ("accepted" or "unsubscribed") as the
 * API field: true records the consent, false the unsubscribe. Anything else:
 * not sent, nothing changes in e-roi.
 */
export function marketingOptIn(value: unknown): boolean | undefined {
	if (value === 'accepted' || value === true) return true;
	if (value === 'unsubscribed') return false;
	return undefined;
}

/** Readable message from an e-roi error body ({ message: string | string[] }). */
export function errorMessage(body: unknown, fallback: string): string {
	const message = (body as { message?: unknown } | undefined)?.message;
	if (Array.isArray(message)) return message.join(' ');
	if (typeof message === 'string' && message.trim()) return message.trim();
	return fallback;
}

/** The trigger events, in the order shown in the node. */
export const EVENTS: Array<{ name: string; value: string; description: string }> = [
	{ name: 'Contact Created', value: 'contact.created', description: 'A new contact is created' },
	{ name: 'Contact Updated', value: 'contact.updated', description: 'Name, email, phone, owner, tags or custom fields of a contact change' },
	{ name: 'Conversation Started', value: 'conversation.created', description: 'A new conversation starts in the inbox' },
	{ name: 'Deal Created', value: 'opportunity.created', description: 'A new deal is created in the CRM' },
	{ name: 'Deal Lost', value: 'opportunity.lost', description: 'A deal is marked as lost' },
	{ name: 'Deal Stage Changed', value: 'opportunity.stage_changed', description: 'A deal moves to another stage' },
	{ name: 'Deal Won', value: 'opportunity.won', description: 'A deal is marked as won (a sale)' },
	{ name: 'Form Submitted', value: 'form.submitted', description: 'A lead submits a form or landing page' },
	{ name: 'Message Received', value: 'message.received', description: 'A customer sends a message to the inbox' },
	{ name: 'Online Store Sale', value: 'order.paid', description: 'An order from a connected online store is paid' },
	{ name: 'Task Created', value: 'task.created', description: 'A task is scheduled on a deal' },
];
