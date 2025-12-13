import { useState } from 'react';
import { Client, ClientStatus } from '@/types/form';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock data for demo
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Juan Pérez García',
    email: 'juan.perez@email.com',
    phone: '+52 55 1234 5678',
    address: 'Calle Reforma 123, CDMX',
    notes: 'Cliente preferencial, visa de turismo',
    status: 'active',
    formsCompleted: 3,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: '2',
    name: 'María López Hernández',
    email: 'maria.lopez@email.com',
    phone: '+52 33 9876 5432',
    status: 'active',
    formsCompleted: 2,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@email.com',
    phone: '+52 81 5555 1234',
    notes: 'Primera vez aplicando',
    status: 'pending',
    formsCompleted: 0,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '4',
    name: 'Ana Martínez Soto',
    email: 'ana.martinez@email.com',
    status: 'inactive',
    formsCompleted: 1,
    createdAt: new Date('2023-11-10'),
    updatedAt: new Date('2024-01-05'),
  },
];

export const useClientStore = () => {
  const [clients, setClients] = useState<Client[]>(mockClients);

  const createClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    const newClient: Client = {
      ...clientData,
      id: generateId(),
      formsCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (clientId: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(client =>
        client.id === clientId
          ? { ...client, ...updates, updatedAt: new Date() }
          : client
      )
    );
  };

  const deleteClient = (clientId: string) => {
    setClients(prev => prev.filter(client => client.id !== clientId));
  };

  const updateClientStatus = (clientId: string, status: ClientStatus) => {
    updateClient(clientId, { status });
  };

  const getClientStats = () => {
    return {
      total: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      inactive: clients.filter(c => c.status === 'inactive').length,
      pending: clients.filter(c => c.status === 'pending').length,
    };
  };

  return {
    clients,
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    getClientStats,
  };
};
