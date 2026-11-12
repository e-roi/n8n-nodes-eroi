# Changelog

## 0.2.3

- e-roi Trigger: when the workflow is activated, only a 404 from e-roi is read as "the subscription no longer exists". Any other failure (invalid API key, network error, 5xx, a subscription that could not be turned back on) is logged and shown to the user, and the subscription id and its secret are kept, so a second subscription is no longer created while the first one is still active.

## 0.2.2

- e-roi node: Expected Close Date keeps the day as written (a late-evening date and time no longer becomes the next day).
- e-roi node: Task Due At without an offset is read in the workflow time zone, not in the clock of the server running n8n.
- docs/API.md updated with the date formats, `due_at` with the time zone, date custom fields and `GET /events`.

## 0.2.0

- e-roi Trigger: the signature covers the delivery timestamp (`<X-Eroi-Timestamp>.<raw body>`) and deliveries older than 5 minutes are refused; a subscription turned off by e-roi is turned back on when the workflow is activated again.
- e-roi node: deals can be updated (title, value, owner, contact, source, expected close date, custom fields); Move to Stage sends the fields the stage requires; Marketing Emails can record the consent or the unsubscribe.
- API keys start with `eroi_` (older `rvs_` keys keep working).

## 0.1.0

- e-roi Trigger: contact created and updated, deal created, stage changed, won and lost, form submitted, conversation started, message received, online store sale, task created (REST hook with signed deliveries).
- e-roi node: contacts (create or update, update, get, find, add tag, add to list, enroll in cadence, add note), deals (create, move to stage, mark as won or lost, find, add tag, add note) and tasks (create).
