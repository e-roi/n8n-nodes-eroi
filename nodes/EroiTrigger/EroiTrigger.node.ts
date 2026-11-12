import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { eroiApiRequest } from '../Eroi/GenericFunctions';
import { EVENTS, signatureIsValid, webhookItem } from '../Eroi/helpers';

/** True only when e-roi answered 404: the subscription does not exist (any more). */
function isNotFound(error: unknown): boolean {
	return String((error as { httpCode?: unknown } | null)?.httpCode ?? '') === '404';
}

/** The error as n8n shows it to the user; errors from the e-roi API already come as NodeApiError. */
function asNodeApiError(context: IHookFunctions, error: unknown): NodeApiError {
	return error instanceof NodeApiError ? error : new NodeApiError(context.getNode(), error as JsonObject);
}

/**
 * Subscribes the workflow webhook URL on e-roi for one event (REST hook) when
 * the workflow is activated, and removes it when the workflow is deactivated.
 * Every delivery is signed (X-Eroi-Signature, HMAC-SHA256 with the secret
 * returned at subscription time, over "<X-Eroi-Timestamp>.<raw body>") and
 * carries the event id for deduplication. A subscription that e-roi turned off
 * (10 failed deliveries or a 410) is turned back on, with the same secret.
 */
export class EroiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'e-roi Trigger',
		name: 'eroiTrigger',
		icon: { light: 'file:../../icons/eroi.svg', dark: 'file:../../icons/eroi.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when something happens in e-roi',
		defaults: { name: 'e-roi Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'eroiApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'contact.created',
				options: EVENTS,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.webhookId) return false;
				const id = String(data.webhookId);
				const path = `/hooks/${encodeURIComponent(id)}`;
				let hook: { url?: string; event?: string; is_active?: boolean };
				try {
					hook = await eroiApiRequest.call(this, 'GET', path);
				} catch (error) {
					// Only a 404 means the subscription no longer exists in e-roi. On any other failure (invalid
					// API key, network error, 5xx) the id and the secret are kept and the error is shown, so n8n
					// does not create a second subscription while the first one is still active.
					if (isNotFound(error)) {
						delete data.webhookId;
						delete data.secret;
						return false;
					}
					this.logger.error(`e-roi: could not check the webhook subscription ${id}: ${(error as Error).message}`);
					throw asNodeApiError(this, error);
				}
				const same = hook.url === this.getNodeWebhookUrl('default') && hook.event === this.getNodeParameter('event');
				if (!same) {
					delete data.webhookId;
					delete data.secret;
					return false;
				}
				if (hook.is_active === false) {
					try {
						await eroiApiRequest.call(this, 'POST', `${path}/reactivate`);
					} catch (error) {
						this.logger.error(`e-roi: could not turn the webhook subscription ${id} back on: ${(error as Error).message}`);
						throw asNodeApiError(this, error);
					}
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const created = (await eroiApiRequest.call(this, 'POST', '/hooks', {
					event: this.getNodeParameter('event') as string,
					url: this.getNodeWebhookUrl('default') as string,
					platform: 'n8n',
				})) as { id?: string; secret?: string };
				if (!created.id) return false;
				const data = this.getWorkflowStaticData('node');
				data.webhookId = created.id;
				data.secret = created.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.webhookId) {
					try {
						await eroiApiRequest.call(this, 'DELETE', `/hooks/${encodeURIComponent(String(data.webhookId))}`);
					} catch (error) {
						this.logger.warn(`e-roi: could not remove the webhook subscription ${String(data.webhookId)}: ${(error as Error).message}`);
						return false;
					}
				}
				delete data.webhookId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject() as unknown as { rawBody?: Buffer | string };
		const secret = String(this.getWorkflowStaticData('node').secret ?? '');
		const headers = this.getHeaderData();
		// With the secret of this subscription, an unsigned, wrongly signed or old (replayed) call is refused.
		if (secret && request.rawBody && !signatureIsValid(secret, request.rawBody, headers['x-eroi-signature'], headers['x-eroi-timestamp'])) {
			const response = this.getResponseObject();
			response.status(401).json({ message: 'Invalid signature' });
			return { noWebhookResponse: true };
		}
		return { workflowData: [this.helpers.returnJsonArray([webhookItem(this.getBodyData()) as IDataObject])] };
	}
}
