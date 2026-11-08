# n8n-nodes-eroi

n8n community nodes for [e-roi](https://eroimkt.com.br), the marketing and sales platform that connects paid media, the inbox and the CRM in one base.

- **e-roi Trigger**: starts a workflow when something happens in e-roi.
- **e-roi**: creates and updates contacts, deals and tasks.

[Installation](#installation) · [Credentials](#credentials) · [Trigger](#e-roi-trigger) · [Actions](#e-roi-actions) · [Example](#example-workflow) · [Compatibility](#compatibility)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-eroi`.

## Credentials

1. In e-roi, sign in as an Administrator and open **Configurações › Integrações › API e webhooks**.
2. On the **n8n** card, click **Criar chave para automações**. Copy the key (it starts with `eroi_`; older keys start with `rvs_`); it is shown only once.
3. In n8n, create an **e-roi API** credential and paste the key. Keep the default API URL.

The integration API is part of the e-roi Scale and Enterprise plans. Each call needs the scope of the operation; the key created by the button above has all of them.

## e-roi Trigger

Pick one event. When the workflow is activated, the node subscribes its webhook URL on e-roi; when it is deactivated, the subscription is removed. The n8n webhook URL must be public HTTPS (n8n Cloud, or a self-hosted n8n with a public domain): e-roi does not deliver to local or private addresses.

| Event | When |
|---|---|
| Contact Created | A new contact is created |
| Contact Updated | Name, email, phone, owner, tags or custom fields change |
| Deal Created | A new deal is created in the CRM |
| Deal Stage Changed | A deal moves to another stage |
| Deal Won | A deal is won (a sale) |
| Deal Lost | A deal is lost |
| Form Submitted | A lead submits a form or landing page |
| Conversation Started | A new conversation starts in the inbox (WhatsApp, Instagram, Messenger or site chat) |
| Message Received | A customer sends a message to the inbox |
| Online Store Sale | An order from a connected online store is paid |
| Task Created | A task is scheduled on a deal |

Every delivery is signed with HMAC-SHA256 (`X-Eroi-Signature: sha256=...`) using the secret of the subscription, and the node refuses calls with a wrong signature. The item has the record fields plus `event_type`, `event_id` (use it to deduplicate) and `test` (true for test events sent from the e-roi panel).

## e-roi actions

- **Contact**: Create or Update (by email or phone, never duplicated), Update, Get, Find, Add Tag, Add to List, Enroll in Cadence, Add Note.
- **Deal**: Create (finds or creates the contact by email or phone), Move to Stage, Mark as Won, Mark as Lost, Find, Add Tag, Add Note.
- **Task**: Create (assigned to the deal owner unless you pick someone).

Dropdowns (pipelines, stages, team, tags, lists, cadences, lost reasons and custom fields) are loaded from your e-roi account. Required fields of a stage and the lost reason are checked like in the e-roi CRM; the error message tells what is missing.

## Example workflow

**Typeform → e-roi**: *Typeform Trigger* → **e-roi** (Contact › Create or Update, map email, phone and name) → **e-roi** (Deal › Create, title "Lead from Typeform", contact ID from the previous step).

**Deal won → spreadsheet**: **e-roi Trigger** (Deal Won) → *Google Sheets* (Append row with title, value and contact name).

## Compatibility

Built with the `@n8n/node-cli` tooling, node API version 1. No runtime dependencies.

## Resources

- [e-roi integration API](docs/API.md)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- e-roi support: suporte@eroimkt.com.br
