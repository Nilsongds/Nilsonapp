import React, { useState, useEffect } from 'react';
import { Debt } from '../types';
import { generateInstallments, saveDebt, formatDate } from '../services/debtService';

interface DebtFormProps {
  onSave: () => void;
  onCancel: () => void;
  initialData?: Debt;
}

export const DebtForm: React.FC<DebtFormProps> = ({ onSave, onCancel, initialData }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [totalValue, setTotalValue] = useState(initialData?.totalValue?.toString() || '');
  const [installmentsCount, setInstallmentsCount] = useState(initialData?.totalInstallments?.toString() || '1');
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  
  // Novos campos solicitados
  const [downPayment, setDownPayment] = useState(initialData?.downPayment?.toString() || '');
  const [installmentValue, setInstallmentValue] = useState(initialData?.installmentValue?.toString() || '');
  
  const [paidCount, setPaidCount] = useState('0'); 
  const [isManualInstallment, setIsManualInstallment] = useState(false);

  // Efeito para calcular o valor da parcela automaticamente
  useEffect(() => {
    if (initialData && !isManualInstallment) return; // Se for edição e não mexeu, mantém.
    if (isManualInstallment) return; // Se usuário digitou manualmente o valor da parcela, não sobrescreve.

    const total = parseFloat(totalValue) || 0;
    const down = parseFloat(downPayment) || 0;
    const count = parseInt(installmentsCount) || 1;

    if (count > 0) {
      const remaining = Math.max(0, total - down);
      const calculated = remaining / count;
      // Formata para 2 casas decimais para o input
      setInstallmentValue(calculated.toFixed(2));
    }
  }, [totalValue, downPayment, installmentsCount, isManualInstallment, initialData]);

  const handleInstallmentValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManualInstallment(true);
    setInstallmentValue(e.target.value);
  };

  // Cálculo da data do próximo vencimento para exibição
  const getNextDueDatePrediction = () => {
    const start = new Date(startDate);
    const paid = parseInt(paidCount) || 0;
    if (isNaN(start.getTime())) return '-';

    // A próxima parcela é a (pagas + 1)
    // Se pagou 0, o vencimento é a data inicial (index 0).
    // Se pagou 1, o vencimento é data inicial + 1 mês.
    const nextDate = new Date(start);
    nextDate.setMonth(start.getMonth() + paid);
    
    // Ajuste simples para fuso
    const userTimezoneOffset = nextDate.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(nextDate.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('pt-BR').format(adjustedDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const count = parseInt(installmentsCount);
    const finalInstallmentValue = parseFloat(installmentValue) || 0;
    const finalDownPayment = parseFloat(downPayment) || 0;
    const finalTotalValue = parseFloat(totalValue) || 0;
    
    let installments = initialData?.installments;

    // Regenerate installments se for novo ou se dados críticos mudaram
    const needsRegeneration = !initialData || 
      (initialData.totalInstallments !== count) || 
      (initialData.installmentValue !== finalInstallmentValue) ||
      (initialData.startDate !== startDate);

    if (needsRegeneration) {
        installments = generateInstallments(
            count,
            finalInstallmentValue,
            startDate,
            parseInt(paidCount)
        );
    }

    const newDebt: Debt = {
      id: initialData?.id || crypto.randomUUID(),
      description,
      totalValue: finalTotalValue,
      downPayment: finalDownPayment,
      installmentValue: finalInstallmentValue,
      totalInstallments: count,
      startDate,
      installments: installments!,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    saveDebt(newDebt);
    onSave();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-2xl mx-auto mt-6 mb-20">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {initialData ? 'Editar Dívida' : 'Nova Dívida'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição da Dívida</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Ex: Cartão de Crédito Nubank, Empréstimo Pessoal..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Value */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Total da Dívida (R$)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
              placeholder="0,00"
              value={totalValue}
              onChange={e => setTotalValue(e.target.value)}
            />
          </div>

          {/* Down Payment (Valor da Entrada) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor da Entrada (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
              placeholder="0,00"
              value={downPayment}
              onChange={e => setDownPayment(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Opcional.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Installment Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Parcelas</label>
            <input
              type="number"
              required
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
              value={installmentsCount}
              onChange={e => setInstallmentsCount(e.target.value)}
            />
          </div>

          {/* Installment Value (Valor da Parcela) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor da Parcela (R$)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
              placeholder="Calculado automaticamente"
              value={installmentValue}
              onChange={handleInstallmentValueChange}
            />
             <p className="text-xs text-gray-400 mt-1">Calculado automaticamente (editável).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Data da 1ª Parcela</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Data base para os vencimentos.</p>
          </div>

          {/* Paid Count */}
           {!initialData && (
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Parcelas Já Pagas</label>
               <input
                type="number"
                min="0"
                max={installmentsCount}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition bg-gray-50 focus:bg-white"
                value={paidCount}
                onChange={e => setPaidCount(e.target.value)}
               />
               <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-700">
                  <span className="font-bold">Próximo Vencimento:</span> {getNextDueDatePrediction()}
               </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-lg shadow-brand-500/30 font-medium transition"
          >
            Salvar Dívida
          </button>
        </div>

      </form>
    </div>
  );
};