import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { eroiApiRequest, optionsFrom } from './GenericFunctions';
import {
	contactFields,
	contactOperations,
	dealFields,
	dealOperations,
	resourceProperty,
	taskFields,
	taskOperations,
} from './descriptions';
import { compact, customFieldsToObject, dateOnly, marketingOptIn, stageName, tagBody } from './helpers';

const id = (value: unknown) => encodeURIComponent(String(value ?? '').trim());

export class Eroi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'e-roi',
		name: 'eroi',
		icon: { light: 'file:../../icons/eroi.svg', dark: 'file:../../icons/eroi.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and update contacts, deals and tasks in e-roi',
		defaults: { name: 'e-roi' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'eroiApi', required: true }],
		properties: [resourceProperty, contactOperations, dealOperations, taskOperations, ...contactFields, ...dealFields, ...taskFields],
	};

	methods = {
		loadOptions: {
			async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/pipelines');
			},
			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const pipeline = String(this.getCurrentNodeParameter('pipelineId') ?? '');
				const stages = (await eroiApiRequest.call(this, 'GET', '/stages', undefined, pipeline ? { pipeline_id: pipeline } : undefined)) as Array<{
					id: string;
					name: string;
					pipeline_name?: string;
				}>;
				return (Array.isArray(stages) ? stages : []).map((s) => ({ name: stageName(s, !!pipeline), value: s.id }));
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/users');
			},
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/tags');
			},
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/lists');
			},
			async getCadences(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/cadences');
			},
			async getLostReasons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return optionsFrom.call(this, '/lost-reasons');
			},
			async getContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const fields = (await eroiApiRequest.call(this, 'GET', '/custom-fields', undefined, { entity: 'contact' })) as Array<{ key: string; label: string }>;
				return (Array.isArray(fields) ? fields : []).map((f) => ({ name: f.label, value: f.key }));
			},
			async getDealFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const fields = (await eroiApiRequest.call(this, 'GET', '/custom-fields', undefined, { entity: 'opportunity' })) as Array<{ key: string; label: string }>;
				return (Array.isArray(fields) ? fields : []).map((f) => ({ name: f.label, value: f.key }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const result = await run.call(this, resource, operation, i);
				const rows = Array.isArray(result) ? result : [result];
				for (const row of rows) output.push({ json: row as IDataObject, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [output];
	}
}

async function run(this: IExecuteFunctions, resource: string, operation: string, i: number): Promise<unknown> {
	const p = (name: string, fallback: unknown = '') => this.getNodeParameter(name, i, fallback);

	if (resource === 'contact') {
		if (operation === 'upsert') {
			const extra = p('additionalFields', {}) as IDataObject;
			const body = <IDataObject>compact({
				...extra,
				email: p('email'),
				phone: p('phone'),
				marketing_opt_in: marketingOptIn(extra.marketing_opt_in),
				custom_fields: customFieldsToObject(p('customFields', {})),
			});
			if (!body.email && !body.phone) throw new NodeOperationError(this.getNode(), 'Fill in the email or the phone of the contact', { itemIndex: i });
			return eroiApiRequest.call(this, 'POST', '/contacts/upsert', body);
		}
		if (operation === 'update') {
			const extra = p('updateFields', {}) as IDataObject;
			const body = <IDataObject>compact({ ...extra, marketing_opt_in: marketingOptIn(extra.marketing_opt_in), custom_fields: customFieldsToObject(p('customFields', {})) });
			return eroiApiRequest.call(this, 'PATCH', `/contacts/${id(p('contactId'))}`, body);
		}
		if (operation === 'get') return eroiApiRequest.call(this, 'GET', `/contacts/${id(p('contactId'))}`);
		if (operation === 'find') {
			const qs = <IDataObject>compact({ email: p('email'), phone: p('phone') });
			if (!qs.email && !qs.phone) throw new NodeOperationError(this.getNode(), 'Fill in the email or the phone to search', { itemIndex: i });
			return eroiApiRequest.call(this, 'GET', '/search/contacts', undefined, qs);
		}
		if (operation === 'addTag') return eroiApiRequest.call(this, 'POST', `/contacts/${id(p('contactId'))}/tags`, tagBody(p('tag')));
		if (operation === 'addToList') return eroiApiRequest.call(this, 'POST', `/contacts/${id(p('contactId'))}/lists`, { list_id: p('listId') });
		if (operation === 'enroll') return eroiApiRequest.call(this, 'POST', `/contacts/${id(p('contactId'))}/cadences`, { cadence_id: p('cadenceId') });
		if (operation === 'addNote') return eroiApiRequest.call(this, 'POST', `/contacts/${id(p('contactId'))}/notes`, { text: p('text') });
	}

	if (resource === 'deal') {
		if (operation === 'create') {
			const extra = p('additionalFields', {}) as IDataObject;
			const contact = <IDataObject>compact({ name: extra.contact_name, email: extra.contact_email, phone: extra.contact_phone });
			const body = <IDataObject>compact({
				title: p('title'),
				contact_id: extra.contact_id,
				contact: Object.keys(contact).length ? contact : undefined,
				pipeline_id: p('pipelineId'),
				stage_id: p('stageId'),
				value: extra.value ? extra.value : undefined,
				owner_id: extra.owner_id,
				source: extra.source,
				expected_close_date: dateOnly(extra.expected_close_date),
				custom_fields: customFieldsToObject(p('customFields', {})),
			});
			return eroiApiRequest.call(this, 'POST', '/opportunities', body);
		}
		if (operation === 'update') {
			const extra = p('updateFields', {}) as IDataObject;
			const body = <IDataObject>compact({
				title: extra.title,
				value: extra.value ? extra.value : undefined,
				owner_id: extra.owner_id,
				contact_id: extra.contact_id,
				source: extra.source,
				expected_close_date: dateOnly(extra.expected_close_date),
				custom_fields: customFieldsToObject(p('customFields', {})),
			});
			return eroiApiRequest.call(this, 'PATCH', `/opportunities/${id(p('dealId'))}`, body);
		}
		if (operation === 'moveStage') {
			const value = p('value', 0) as number;
			const extra = p('stageFields', {}) as IDataObject;
			return eroiApiRequest.call(
				this,
				'POST',
				`/opportunities/${id(p('dealId'))}/stage`,
				<IDataObject>compact({
					stage_id: p('stageId'),
					lost_reason_id: p('lostReasonId'),
					value: value > 0 ? value : undefined,
					estimated_value: extra.estimated_value ? extra.estimated_value : undefined,
					expected_close_date: dateOnly(extra.expected_close_date),
					owner_id: extra.owner_id,
					custom_fields: customFieldsToObject(p('customFields', {})),
				}),
			);
		}
		if (operation === 'markWon') {
			const value = p('value', 0) as number;
			return eroiApiRequest.call(this, 'POST', `/opportunities/${id(p('dealId'))}/won`, <IDataObject>compact({ value: value > 0 ? value : undefined }));
		}
		if (operation === 'markLost') return eroiApiRequest.call(this, 'POST', `/opportunities/${id(p('dealId'))}/lost`, { lost_reason_id: p('lostReasonId') });
		if (operation === 'addTag') return eroiApiRequest.call(this, 'POST', `/opportunities/${id(p('dealId'))}/tags`, tagBody(p('tag')));
		if (operation === 'addNote') return eroiApiRequest.call(this, 'POST', `/opportunities/${id(p('dealId'))}/notes`, { text: p('text') });
		if (operation === 'find') {
			const filters = p('filters', {}) as IDataObject;
			const qs = <IDataObject>compact({ ...filters, limit: String(p('limit', 50)) });
			if (!qs.title && !qs.contact_id && !qs.email && !qs.phone) {
				throw new NodeOperationError(this.getNode(), 'Add at least one filter: title, contact ID, email or phone', { itemIndex: i });
			}
			return eroiApiRequest.call(this, 'GET', '/search/opportunities', undefined, qs);
		}
	}

	if (resource === 'task' && operation === 'create') {
		const extra = p('additionalFields', {}) as IDataObject;
		const due = new Date(String(p('dueAt')));
		if (Number.isNaN(due.getTime())) throw new NodeOperationError(this.getNode(), 'Due At is not a valid date', { itemIndex: i });
		return eroiApiRequest.call(this, 'POST', '/tasks', <IDataObject>compact({ opportunity_id: p('dealId'), title: p('title'), due_at: due.toISOString(), ...extra }));
	}

	throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for "${resource}"`, { itemIndex: i });
}
