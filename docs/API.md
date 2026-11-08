# e-roi integration API

Reference of the API used by the e-roi apps for Zapier, Make and n8n (and by any system that integrates with e-roi). The full public documentation, in Portuguese, is at https://www.eroimkt.com.br/api.

- Base URL: `https://api.eroimkt.com.br/v1/api/v1` (the first `v1` is the platform prefix; the second one is the version of the integration API).
- Authentication: `Authorization: Bearer eroi_...` (an API key created by an e-roi Administrator in **Configurações › Integrações › API e webhooks**). Keys created before November 2026 start with `rvs_` and keep working.
- Format: JSON in and out. Money is in BRL, in reais (`value`, number with two decimals); inputs also accept Brazilian text such as `"1.500,50"` or `"1.500"` (and the US text `"1,500.50"`). Dates are ISO 8601; date-only fields use `YYYY-MM-DD`. Date-times come out in UTC as PostgreSQL writes them, such as `2026-01-10T12:00:00.123456+00:00` (the fraction of a second has 0 to 6 digits and is left out on a whole second).
- Limits: 120 requests per minute per key (HTTP 429 with `Retry-After` above it). 30 invalid keys in 10 minutes from the same address get HTTP 429 `too_many_invalid_keys`.
- Errors: HTTP status plus `{ "message": "...", "request_id": "..." }` in Portuguese, written for developers (unknown fields are named, e.g. `O campo notas não existe nesta rota`). The key errors carry an `error` code: `api_key_required`, `invalid_api_key`, `api_key_expired`, `tenant_inactive`, `api_not_in_plan`, `access_blocked`, `ip_not_allowed`, `insufficient_api_scope`, `too_many_invalid_keys`.
- Plan: the integration API is part of the Scale and Enterprise plans.

## Scopes

| Scope | Allows |
|---|---|
| `contacts:read` / `contacts:write` | Read contacts / create, update, tag, add to list, enroll in cadence, add notes |
| `opportunities:read` / `opportunities:write` | Read deals / create, update, move, win, lose, tag, add notes |
| `tasks:read` / `tasks:write` | Task trigger / create tasks |
| `conversations:read` | Conversation and message triggers |
| `forms:read` | Form submission trigger |
| `orders:read` | Online store sale trigger |
| `webhooks:write` | Subscribe, unsubscribe and reactivate webhooks |
| `full_access` | Everything above |

A key can also have an expiry date and a list of allowed IP addresses (set in the panel when the key is created).

## Connection

`GET /me` returns `{ company: { id, name }, key: { name, prefix, scopes }, events: [...] }`. `GET /events` returns the trigger catalog: `[{ key, label, scope }]`.

## Pagination

`GET /contacts`, `GET /opportunities`, `GET /search/opportunities` and `GET /triggers/:event` accept `page` (from 1) together with `limit`. The body is always a JSON array; the page goes in the headers `X-Page`, `X-Per-Page` and, when there is a next page, `X-Next-Page`. Without `page`, the first page is returned. Defaults: `GET /contacts` and `GET /opportunities` 50 (up to 200), `GET /triggers/:event` 25 (up to 100), `GET /search/opportunities` 10 (up to 100). The dropdown lists and `GET /hooks` come whole.

## Triggers

Events: `contact.created`, `contact.updated`, `opportunity.created`, `opportunity.stage_changed`, `opportunity.won`, `opportunity.lost`, `form.submitted`, `conversation.created`, `message.received`, `order.paid`, `task.created`. Each one needs the read scope of its resource.

### Webhook subscription (REST hooks)

- `POST /hooks` with `{ "event": "opportunity.won", "url": "https://...", "platform": "zapier" | "make" | "n8n" | "api" }` returns `{ id, event, url, secret, ... }` (the secret is returned only here). The URL must be public HTTPS.
- `GET /hooks`, `GET /hooks/:id`: subscriptions made through the API with the SAME key (other keys of the company do not see them).
- `DELETE /hooks/:id`: removes a subscription of the same key (always 200, also when it no longer exists or belongs to another key).
- `POST /hooks/:id/reactivate`: turns a subscription back on after it was turned off (10 failed deliveries in a row, or a `410` answer). The secret stays the same.
- Deliveries stop when the key that subscribed is revoked, expires or loses the read scope of the event.

Each delivery is a `POST` with:

```json
{
  "id": "delivery id",
  "event_type": "opportunity.won",
  "event_id": "event id (same on retries and redeliveries)",
  "created_at": "2026-11-05T12:00:00.000Z",
  "tenant_id": "company id",
  "data": { "...": "the record, same shape as the polling list" }
}
```

Headers: `X-Eroi-Signature`, `X-Eroi-Timestamp` (Unix time in seconds), `X-Eroi-Event`, `X-Eroi-Delivery`, `User-Agent: Eroi-Webhooks/1.0`.

Signature: `X-Eroi-Signature: sha256=<hex>`, where `<hex>` is the HMAC-SHA256, with the subscription secret as key, of `<X-Eroi-Timestamp>.<raw body>` (the timestamp, a dot, then the exact bytes of the body). Check the signature with a constant-time comparison and reject deliveries whose timestamp is more than 5 minutes (300 seconds) away from your clock: a captured delivery cannot be replayed later. Each attempt is signed again with its own timestamp.

Each delivery has up to 3 attempts in total (waits of 2 s and 4 s, 10 s timeout per attempt; redirects are not followed). Answering `410 Gone` turns the subscription off right away; 10 failed deliveries in a row turn it off too. Use `event_id` to ignore repeated deliveries. Test deliveries sent from the e-roi panel carry `"test": true` and their own `event_id`.

### Polling list

`GET /triggers/:event?limit=25&page=1` returns the records of the event, newest first. Each item has a unique `id` per occurrence (for `contact.updated`, `opportunity.stage_changed`, `opportunity.won` and `opportunity.lost` the id changes at each occurrence; the record id is in `contact_id` or `opportunity_id`). `task.created` lists only open tasks, like the webhook.

## Reading

- `GET /contacts?desde=YYYY-MM-DD&limit=&page=`: contacts, newest first (`desde`: created on or after the day).
- `GET /contacts/:id`.
- `GET /search/contacts?email=&phone=` returns `[]` or `[contact]` (phone in any format).
- `GET /opportunities?status=&pipeline_id=&desde=&limit=&page=`: deals, newest first, without merged and archived deals. `status`: `open`, `won`, `lost`, `any` or one of `new`, `contacted`, `qualified`, `proposal_sent`, `negotiating`.
- `GET /opportunities/:id`.
- `GET /search/opportunities?title=&contact_id=&email=&phone=&status=open|won|lost|any&pipeline_id=&limit=&page=` returns deals, newest first.

Contacts and deals have the same shape in every route, in the webhook and in the polling list: values in reais (`value`, `estimated_value`, `actual_value`), `email`/`phone`, CRM tags (`tags`: tag names) and the owner (`owner_id`, `owner_name`).

## Actions

| Method and path | Body |
|---|---|
| `POST /contacts` | `email` and/or `phone` (required), `name`, `company`, `source`, `lifecycle_stage`, `owner_id`, `marketing_opt_in`, `notes`, `custom_fields`. Creates the contact with the CRM rules (201). When a contact with the same email or phone exists, returns it unchanged with `created: false` (200). |
| `POST /contacts/upsert` | `email` and/or `phone` (required, used to find the contact), `name`, `company`, `source`, `lifecycle_stage` (`lead`, `customer`, `churned`), `owner_id`, `marketing_opt_in`, `notes`, `custom_fields`. Found: only the filled fields change; the email and phone the contact already has stay, and the one it did not have yet is added (unless it belongs to another contact). |
| `PATCH /contacts/:id` | the same fields; blank fields are left as they are; `notes` is added to the contact notes (newest on top); the phone is stored in the canonical form; an email or phone of another contact is refused (409) |
| `POST /contacts/:id/tags` | `tag_id` or `tag_name` (created when missing) |
| `POST /contacts/:id/lists` | `list_id` (static lists) |
| `POST /contacts/:id/cadences` | `cadence_id` |
| `POST /contacts/:id/notes` | `text` |
| `POST /opportunities` | `title`, `contact_id` or `contact: { name, email, phone, company }`, `pipeline_id`, `stage_id`, `value`, `owner_id`, `source`, `expected_close_date` (YYYY-MM-DD), `custom_fields`. With `pipeline_id` and no `stage_id`, the deal starts in the first stage of that pipeline; a `stage_id` of another pipeline is refused. With `contact`, the contact is found (by email or phone) or created: a found contact only gets what it did not have (email, phone, company); its name, company and source stay. |
| `PATCH /opportunities/:id` | `title`, `value`, `owner_id`, `contact_id`, `source`, `expected_close_date`, `custom_fields` (merged with the current ones); blank fields are left as they are. The stage changes only through `/stage`. |
| `POST /opportunities/:id/stage` | `stage_id`, `lost_reason_id` (lost stage), `value` (closed value, won stage), and the fields the stage requires: `estimated_value`, `expected_close_date`, `owner_id`, `custom_fields` |
| `POST /opportunities/:id/won` | `value` |
| `POST /opportunities/:id/lost` | `lost_reason_id` |
| `POST /opportunities/:id/tags` | `tag_id` or `tag_name` |
| `POST /opportunities/:id/notes` | `text` |
| `POST /tasks` | `opportunity_id`, `title`, `due_at` (ISO 8601 date-time, with `Z` or an offset; without the offset, Brasília time; a date without the time is refused with 400), `type` (`task`, `call`, `email`, `meeting`), `description`, `owner_id` |

`custom_fields` is an object keyed by the field `key` (see `GET /custom-fields`). A field of type `date` keeps the day as `YYYY-MM-DD`; it also accepts an ISO 8601 date-time (what the date pickers of Make, Zapier and n8n send) and stores the day of that moment in the company time zone (default `America/Sao_Paulo`). A date-time without an offset keeps the day as written.

`marketing_opt_in`: `true` records the email marketing consent and `false` records the unsubscribe (it stops marketing emails, automations and cadences by email), both in the contact consent trail with the source "API". Leave it out when you do not know.

Required fields of a pipeline stage and the lost reason are checked like in the e-roi CRM. When the stage requires a field the deal does not have, the answer is 400 with `error: "stage_required_fields"` and `missing_fields` (`estimated_value`, `expected_close_date`, `owner_id`, `custom_fields.<key>`): send them in the same `/stage` call. Without `owner_id`, a new deal follows the company round-robin; a task goes to the deal owner.

## Dropdown lists

`GET /pipelines`, `GET /stages?pipeline_id=`, `GET /users`, `GET /tags`, `GET /lists`, `GET /cadences`, `GET /lost-reasons` return `[{ id, name }]` (stages also carry `pipeline_id` and `pipeline_name`). `GET /custom-fields?entity=contact|opportunity` returns `[{ key, label, type, options, choices }]`.

Scopes of the lists (read OR write of the resource): `pipelines`, `stages`, `lost-reasons` need `opportunities:read` or `opportunities:write`; `lists` and `cadences` need `contacts:read` or `contacts:write`; `tags` needs one of the contacts or opportunities scopes; `users` one of the contacts, opportunities or tasks scopes; `custom-fields` returns only the entities the key can read (`entity=` of another one: 403). The "key for automations" shortcut of the panel has all of them.
