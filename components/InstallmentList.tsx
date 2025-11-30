import React from 'react';
import { Installment } from '../types';
import { formatDate, formatCurrency } from '../services/debtService';

interface InstallmentListProps {
  installments: Installment[];
  onToggle: (id: string, currentStatus: boolean) => void;
}

export const InstallmentList: React.FC<InstallmentListProps> = ({ installments, onToggle }) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <div className="col-span-2 sm:col-span-1 text-center">Parcela</div>
        <div className="col-span-4 sm:col-span-3">Vencimento</div>
        <div className="col-span-3 sm:col-span-4 text-right">Valor</div>
        <div className="col-span-3 sm:col-span-4 text-center">Pago?</div>
      </div>
      
      {/* List */}
      <div className="divide-y divide-gray-100">
        {installments.map((inst) => {
          const isLate = !inst.isPaid && inst.dueDate < today;
          
          return (
            <div 
              key={inst.id} 
              className={`grid grid-cols-12 gap-2 p-4 items-center transition-colors hover:bg-gray-50 ${inst.isPaid ? 'bg-green-50/20' : ''}`}
            >
              <div className="col-span-2 sm:col-span-1 text-center font-medium text-gray-500">
                {inst.number}
              </div>
              
              <div className="col-span-4 sm:col-span-3 flex flex-col justify-center">
                <span className={`text-sm ${isLate ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                  {formatDate(inst.dueDate)}
                </span>
                {isLate && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 w-fit mt-0.5">
                    Atrasada
                  </span>
                )}
              </div>
              
              <div className="col-span-3 sm:col-span-4 text-right text-sm font-medium text-gray-900">
                {formatCurrency(inst.value)}
              </div>
              
              <div className="col-span-3 sm:col-span-4 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <span className={`hidden sm:block text-xs font-medium w-16 text-right ${inst.isPaid ? 'text-green-600' : 'text-gray-400'}`}>
                        {inst.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                    <button
                    onClick={() => onToggle(inst.id, inst.isPaid)}
                    className={`
                        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                        ${inst.isPaid ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                    role="switch"
                    aria-checked={inst.isPaid}
                    title={inst.isPaid ? "Marcar como não pago" : "Marcar como pago"}
                    >
                    <span
                        aria-hidden="true"
                        className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${inst.isPaid ? 'translate-x-5' : 'translate-x-0'}
                        `}
                    />
                    </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};