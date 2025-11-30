export enum DebtStatus {
  ON_TIME = 'Em dia',
  LATE = 'Atrasada',
  PAID_OFF = 'Quitada'
}

export interface Installment {
  id: string;
  number: number; // 1, 2, 3...
  value: number;
  dueDate: string; // ISO Date string
  isPaid: boolean;
  paidDate?: string; // ISO Date string
  reminder?: string; // ISO Date string for the reminder notification
}

export interface Debt {
  id: string;
  description: string;
  totalValue: number;
  downPayment: number; // Valor da entrada
  installmentValue: number;
  totalInstallments: number;
  startDate: string; // Data da primeira parcela
  installments: Installment[];
  createdAt: string;
}

export interface DashboardSummary {
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyCommitment: number;
  debtsCount: number;
}