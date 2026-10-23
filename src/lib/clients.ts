import {listRecords, putRecord, type Versioned} from './cloud';
export type Client = Versioned & {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  updatedAt: string;
  archived?: boolean;
};

export const clientsKey = 'orcaseg-clients-v1';
export const selectedClientKey = 'orcaseg-selected-client-v1';

export async function readClients(): Promise<Client[]> {
  const value = await listRecords<Client>('clients');
  if (!Array.isArray(value) || !value.every(client => client &&
    ['id','name','phone','email','address','notes','updatedAt'].every(key => typeof client[key] === 'string') &&
    client.name.trim() && (client.archived === undefined || typeof client.archived === 'boolean'))) {
    throw new Error('Cadastro de clientes inválido.');
  }
  return value;
}

export const writeClient = (client:Client) => putRecord('clients',client.id,client);

export const normalizeClient = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
