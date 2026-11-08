import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EroiApi implements ICredentialType {
	name = 'eroiApi';

	displayName = 'e-roi API';

	icon: Icon = { light: 'file:../icons/eroi.svg', dark: 'file:../icons/eroi.dark.svg' };

	documentationUrl = 'https://github.com/e-roi/n8n-nodes-eroi?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'In e-roi, open Configurações › Integrações › API e webhooks and click "Criar chave para automações" on the n8n card. The key starts with eroi_ (older keys start with rvs_).',
		},
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.eroimkt.com.br/v1/api/v1',
			description: 'Leave as it is, unless the e-roi team gave you another address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/me',
			method: 'GET',
		},
	};
}
