import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { DEFAULT_BASE_URL, errorMessage } from './helpers';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/** Calls the e-roi integration API with the e-roi API credential. */
export async function eroiApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
	const credentials = await this.getCredentials('eroiApi');
	const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
		headers: { Accept: 'application/json' },
	};
	if (body && Object.keys(body).length) options.body = body;
	if (qs && Object.keys(qs).length) options.qs = qs;
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'eroiApi', options);
	} catch (error) {
		const response = (error as { response?: { body?: unknown; data?: unknown } }).response;
		const message = errorMessage(response?.body ?? response?.data, 'e-roi did not accept the request');
		throw new NodeApiError(this.getNode(), error as JsonObject, { message });
	}
}

/** id + name lists from the API as dropdown options. */
export async function optionsFrom(this: ILoadOptionsFunctions, path: string, qs?: IDataObject): Promise<INodePropertyOptions[]> {
	const list = (await eroiApiRequest.call(this, 'GET', path, undefined, qs)) as Array<{ id: string; name: string }>;
	return (Array.isArray(list) ? list : []).map((item) => ({ name: item.name, value: item.id }));
}
