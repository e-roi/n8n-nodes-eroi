import type { INodeProperties } from 'n8n-workflow';

const show = (resource: string, operation: string[]) => ({ show: { resource: [resource], operation } });

// ---------------------------------------------------------------------------
// Resources and operations
// ---------------------------------------------------------------------------
export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Contact', value: 'contact' },
		{ name: 'Deal', value: 'deal' },
		{ name: 'Task', value: 'task' },
	],
	default: 'contact',
};

export const contactOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['contact'] } },
	options: [
		{ name: 'Add Note', value: 'addNote', action: 'Add a note to a contact', description: 'Add a note to the contact notes, newest on top' },
		{ name: 'Add Tag', value: 'addTag', action: 'Add a tag to a contact', description: 'Add a CRM tag to a contact' },
		{ name: 'Add to List', value: 'addToList', action: 'Add a contact to a list', description: 'Add a contact to a static list used by email campaigns' },
		{ name: 'Create or Update', value: 'upsert', action: 'Create or update a contact', description: 'Create a new record, or update the current one if it already exists (upsert)' },
		{ name: 'Enroll in Cadence', value: 'enroll', action: 'Enroll a contact in a cadence', description: 'Put a contact in a sales cadence' },
		{ name: 'Find', value: 'find', action: 'Find a contact', description: 'Find a contact by email or phone' },
		{ name: 'Get', value: 'get', action: 'Get a contact', description: 'Get a contact by ID' },
		{ name: 'Update', value: 'update', action: 'Update a contact', description: 'Update a contact; blank fields are left as they are' },
	],
	default: 'upsert',
};

export const dealOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['deal'] } },
	options: [
		{ name: 'Add Note', value: 'addNote', action: 'Add a note to a deal', description: 'Add a note to the deal timeline' },
		{ name: 'Add Tag', value: 'addTag', action: 'Add a tag to a deal', description: 'Add a CRM tag to a deal' },
		{ name: 'Create', value: 'create', action: 'Create a deal', description: 'Create a deal; with an email or phone, the contact is found or created first' },
		{ name: 'Find', value: 'find', action: 'Find deals', description: 'Find deals by title, contact, email or phone' },
		{ name: 'Mark as Lost', value: 'markLost', action: 'Mark a deal as lost', description: 'Move the deal to the lost stage of its pipeline' },
		{ name: 'Mark as Won', value: 'markWon', action: 'Mark a deal as won', description: 'Move the deal to the won stage of its pipeline' },
		{ name: 'Move to Stage', value: 'moveStage', action: 'Move a deal to a stage', description: 'Move a deal to another stage of the pipeline' },
		{ name: 'Update', value: 'update', action: 'Update a deal', description: 'Update a deal; blank fields are left as they are' },
	],
	default: 'create',
};

export const taskOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['task'] } },
	options: [{ name: 'Create', value: 'create', action: 'Create a task', description: 'Schedule a task on a deal' }],
	default: 'create',
};

// ---------------------------------------------------------------------------
// Contact fields
// ---------------------------------------------------------------------------
const customFields = (method: string): INodeProperties => ({
	displayName: 'Custom Fields',
	name: 'customFields',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Custom Field',
	default: {},
	options: [
		{
			displayName: 'Field',
			name: 'field',
			values: [
				{
					displayName: 'Field Name or ID',
					name: 'key',
					type: 'options',
					typeOptions: { loadOptionsMethod: method },
					default: '',
					description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				},
				{ displayName: 'Value', name: 'value', type: 'string', default: '' },
			],
		},
	],
});

const contactIdField = (operations: string[]): INodeProperties => ({
	displayName: 'Contact ID',
	name: 'contactId',
	type: 'string',
	required: true,
	default: '',
	displayOptions: show('contact', operations),
	description: 'ID of the contact (from a trigger or from the Find operation)',
});

const contactExtraFields = (update: boolean): INodeProperties[] => [
	{ displayName: 'Company', name: 'company', type: 'string', default: '' },
	...(update ? [{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' } as INodeProperties] : []),
	{
		displayName: 'Lifecycle Stage',
		name: 'lifecycle_stage',
		type: 'options',
		options: [
			{ name: 'Churned', value: 'churned' },
			{ name: 'Customer', value: 'customer' },
			{ name: 'Lead', value: 'lead' },
		],
		default: 'lead',
	},
	{
		displayName: 'Marketing Emails',
		name: 'marketing_opt_in',
		type: 'options',
		options: [
			{ name: 'Accepted', value: 'accepted', description: 'The person agreed to receive marketing emails' },
			{ name: 'Unsubscribed', value: 'unsubscribed', description: 'The person unsubscribed: e-roi stops marketing emails to them' },
		],
		default: 'accepted',
	},
	{ displayName: 'Name', name: 'name', type: 'string', default: '' },
	{ displayName: 'Note', name: 'notes', type: 'string', typeOptions: { rows: 3 }, default: '' },
	{
		displayName: 'Owner Name or ID',
		name: 'owner_id',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		default: '',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	...(update ? [{ displayName: 'Phone', name: 'phone', type: 'string', default: '' } as INodeProperties] : []),
	{ displayName: 'Source', name: 'source', type: 'string', default: '', description: 'Where the contact came from' },
];

export const contactFields: INodeProperties[] = [
	contactIdField(['update', 'get', 'addTag', 'addToList', 'enroll', 'addNote']),
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: show('contact', ['upsert', 'find']),
		description: 'Email or phone is required: the contact is found by them and never duplicated',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		displayOptions: show('contact', ['upsert', 'find']),
		description: 'Phone with area code, like (11) 99999-0000',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('contact', ['upsert']),
		options: contactExtraFields(false),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('contact', ['update']),
		options: contactExtraFields(true),
	},
	{ ...customFields('getContactFields'), displayOptions: show('contact', ['upsert', 'update']) },
	{
		displayName: 'Tag Name or ID',
		name: 'tag',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTags' },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['contact', 'deal'], operation: ['addTag'] } },
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'An expression with a new tag name creates the tag in e-roi',
	},
	{
		displayName: 'List Name or ID',
		name: 'listId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLists' },
		required: true,
		default: '',
		displayOptions: show('contact', ['addToList']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Cadence Name or ID',
		name: 'cadenceId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCadences' },
		required: true,
		default: '',
		displayOptions: show('contact', ['enroll']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Note',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['contact', 'deal'], operation: ['addNote'] } },
	},
];

// ---------------------------------------------------------------------------
// Deal fields
// ---------------------------------------------------------------------------
const dealIdField: INodeProperties = {
	displayName: 'Deal ID',
	name: 'dealId',
	type: 'string',
	required: true,
	default: '',
	displayOptions: show('deal', ['update', 'moveStage', 'markWon', 'markLost', 'addTag', 'addNote']),
	description: 'ID of the deal (from a trigger or from the Find operation)',
};

const pipelineField = (operations: string[], description: string): INodeProperties => ({
	displayName: 'Pipeline Name or ID',
	name: 'pipelineId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getPipelines' },
	default: '',
	displayOptions: show('deal', operations),
	description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	hint: description,
});

const stageField = (operations: string[], required: boolean): INodeProperties => ({
	displayName: 'Stage Name or ID',
	name: 'stageId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getStages', loadOptionsDependsOn: ['pipelineId'] },
	required,
	default: '',
	displayOptions: show('deal', operations),
	description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
});

const lostReasonField = (operations: string[], required: boolean): INodeProperties => ({
	displayName: 'Lost Reason Name or ID',
	name: 'lostReasonId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getLostReasons' },
	required,
	default: '',
	displayOptions: show('deal', operations),
	description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	hint: 'Required when the stage is a lost stage',
});

export const dealFields: INodeProperties[] = [
	dealIdField,
	{ displayName: 'Title', name: 'title', type: 'string', required: true, default: '', displayOptions: show('deal', ['create']) },
	pipelineField(['create'], 'Blank: the main pipeline'),
	pipelineField(['moveStage'], 'Only to filter the stages below'),
	stageField(['create'], false),
	stageField(['moveStage'], true),
	lostReasonField(['moveStage'], false),
	lostReasonField(['markLost'], true),
	{
		displayName: 'Closed Value (BRL)',
		name: 'value',
		type: 'number',
		typeOptions: { minValue: 0, numberPrecision: 2 },
		default: 0,
		displayOptions: show('deal', ['moveStage', 'markWon']),
		description: 'Value of the sale. Zero keeps the value of the deal.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('deal', ['create']),
		options: [
			{ displayName: 'Contact Email', name: 'contact_email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
			{ displayName: 'Contact Name', name: 'contact_name', type: 'string', default: '' },
			{ displayName: 'Contact Phone', name: 'contact_phone', type: 'string', default: '' },
			{ displayName: 'Expected Close Date', name: 'expected_close_date', type: 'dateTime', default: '' },
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Blank: the company round-robin decides',
			},
			{ displayName: 'Source', name: 'source', type: 'string', default: '' },
			{ displayName: 'Value (BRL)', name: 'value', type: 'number', typeOptions: { minValue: 0, numberPrecision: 2 }, default: 0 },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('deal', ['update']),
		options: [
			{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
			{ displayName: 'Expected Close Date', name: 'expected_close_date', type: 'dateTime', default: '' },
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{ displayName: 'Source', name: 'source', type: 'string', default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{ displayName: 'Value (BRL)', name: 'value', type: 'number', typeOptions: { minValue: 0, numberPrecision: 2 }, default: 0 },
		],
	},
	{
		displayName: 'Stage Fields',
		name: 'stageFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('deal', ['moveStage']),
		description: 'Fields the stage requires, saved in the same move',
		options: [
			{ displayName: 'Deal Value (BRL)', name: 'estimated_value', type: 'number', typeOptions: { minValue: 0, numberPrecision: 2 }, default: 0 },
			{ displayName: 'Expected Close Date', name: 'expected_close_date', type: 'dateTime', default: '' },
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	},
	{ ...customFields('getDealFields'), displayOptions: show('deal', ['create', 'update', 'moveStage']) },
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('deal', ['find']),
		options: [
			{ displayName: 'Contact Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
			{ displayName: 'Contact Phone', name: 'phone', type: 'string', default: '' },
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipeline_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Lost', value: 'lost' },
					{ name: 'Open', value: 'open' },
					{ name: 'Won', value: 'won' },
				],
				default: 'open',
			},
			{ displayName: 'Title Contains', name: 'title', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: show('deal', ['find']),
		description: 'Max number of results to return',
	},
];

// ---------------------------------------------------------------------------
// Task fields
// ---------------------------------------------------------------------------
export const taskFields: INodeProperties[] = [
	{ displayName: 'Deal ID', name: 'dealId', type: 'string', required: true, default: '', displayOptions: show('task', ['create']) },
	{ displayName: 'Title', name: 'title', type: 'string', required: true, default: '', displayOptions: show('task', ['create']) },
	{ displayName: 'Due At', name: 'dueAt', type: 'dateTime', required: true, default: '', displayOptions: show('task', ['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('task', ['create']),
		options: [
			{
				displayName: 'Assign To Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Blank: the deal owner',
			},
			{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Email', value: 'email' },
					{ name: 'Meeting', value: 'meeting' },
					{ name: 'Task', value: 'task' },
				],
				default: 'task',
			},
		],
	},
];
