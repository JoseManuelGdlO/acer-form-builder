import type { Client } from '@/types/form';

export type AccountsReceivableSnapshot = {
  amount: number;
  accounts: number;
};

/**
 * Cartera (stock): saldo pendiente de titulares con cuota pactada.
 * No recorta por periodo de finanzas.
 */
export function accountsReceivableFromClients(clients: Client[]): AccountsReceivableSnapshot {
  let amount = 0;
  let accounts = 0;
  for (const client of clients) {
    if (client.parentClientId) continue;
    if (typeof client.totalAmountDue !== 'number' || !Number.isFinite(client.totalAmountDue)) continue;
    const paid =
      typeof client.totalPaid === 'number' && Number.isFinite(client.totalPaid) ? client.totalPaid : 0;
    const pending = Math.max(0, client.totalAmountDue - paid);
    if (pending > 0) {
      amount += pending;
      accounts += 1;
    }
  }
  return { amount, accounts };
}
