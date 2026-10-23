export type Client = {
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

export function readClients(): Client[] {
  const value = JSON.parse(localStorage.getItem(clientsKey) || '[]');
  if (!Array.isArray(value) || !value.every(client => client &&
    ['id','name','phone','email','address','notes','updatedAt'].every(key => typeof client[key] === 'string') &&
    client.name.trim() && (client.archived === undefined || typeof client.archived === 'boolean'))) {
    throw new Error('Cadastro de clientes inválido.');
  }
  return value;
}

export function writeClients(clients: Client[]) {
  localStorage.setItem(clientsKey, JSON.stringify(clients));
}

export const normalizeClient = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
