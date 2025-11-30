import { Debt, Installment, DebtStatus } from '../types';

const STORAGE_KEY = 'debtflow_data_v1';

// Helper to format currency
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Helper to format date
export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // Adjust for timezone offset to prevent day shifting
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  
  return new Intl.DateTimeFormat('pt-BR').format(adjustedDate);
};

export const getStatusColor = (status: DebtStatus) => {
  switch (status) {
    case DebtStatus.PAID_OFF: return 'bg-green-100 text-green-800 border-green-200';
    case DebtStatus.LATE: return 'bg-red-100 text-red-800 border-red-200';
    case DebtStatus.ON_TIME: return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Generate Installments based on user input
export const generateInstallments = (
  count: number,
  amount: number,
  firstDueDate: string,
  paidCount: number
): Installment[] => {
  const installments: Installment[] = [];
  const start = new Date(firstDueDate);

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(start.getMonth() + i);

    installments.push({
      id: crypto.randomUUID(),
      number: i + 1,
      value: amount,
      dueDate: dueDate.toISOString().split('T')[0],
      isPaid: i < paidCount,
      paidDate: i < paidCount ? new Date().toISOString() : undefined,
    });
  }
  return installments;
};

// Calculate status based on installments
export const calculateDebtStatus = (debt: Debt): DebtStatus => {
  const allPaid = debt.installments.every(i => i.isPaid);
  if (allPaid) return DebtStatus.PAID_OFF;

  const today = new Date().toISOString().split('T')[0];
  const hasLate = debt.installments.some(i => !i.isPaid && i.dueDate < today);
  
  return hasLate ? DebtStatus.LATE : DebtStatus.ON_TIME;
};

// Storage Operations
export const getDebts = (): Debt[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveDebt = (debt: Debt): void => {
  const debts = getDebts();
  const existingIndex = debts.findIndex(d => d.id === debt.id);
  
  if (existingIndex >= 0) {
    debts[existingIndex] = debt;
  } else {
    debts.push(debt);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
};

export const deleteDebt = (id: string): void => {
  const debts = getDebts().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
};

export const toggleInstallmentPayment = (debtId: string, installmentId: string, isPaid: boolean): Debt | null => {
  const debts = getDebts();
  const debtIndex = debts.findIndex(d => d.id === debtId);
  
  if (debtIndex === -1) return null;

  const debt = debts[debtIndex];
  const installmentIndex = debt.installments.findIndex(i => i.id === installmentId);
  
  if (installmentIndex === -1) return null;

  debt.installments[installmentIndex].isPaid = isPaid;
  debt.installments[installmentIndex].paidDate = isPaid ? new Date().toISOString() : undefined;

  debts[debtIndex] = debt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
  
  return debt;
};

export const setInstallmentReminder = (debtId: string, installmentId: string, reminderDate: string): Debt | null => {
  const debts = getDebts();
  const debtIndex = debts.findIndex(d => d.id === debtId);
  if (debtIndex === -1) return null;

  const debt = debts[debtIndex];
  const instIndex = debt.installments.findIndex(i => i.id === installmentId);
  if (instIndex === -1) return null;

  debt.installments[instIndex].reminder = reminderDate;
  
  debts[debtIndex] = debt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
  return debt;
};