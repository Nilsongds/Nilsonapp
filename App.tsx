import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Debt, DebtStatus, DashboardSummary, Installment } from './types';
import { getDebts, calculateDebtStatus, formatCurrency, deleteDebt, toggleInstallmentPayment, formatDate, setInstallmentReminder } from './services/debtService';
import { analyzeDebtsWithGemini } from './services/geminiService';
import { DebtForm } from './components/DebtForm';
import { InstallmentList } from './components/InstallmentList';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- Components ---

const Settings = () => {
  const handleClearData = () => {
    if (window.confirm('Tem certeza? Isso apagará TODAS as dívidas cadastradas e não pode ser desfeito.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Dados do Aplicativo</h3>
          <p className="text-sm text-gray-500">Gerencie seus dados locais</p>
        </div>
        <div className="p-4">
          <button 
            onClick={handleClearData}
            className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-red-50 text-red-600 transition"
          >
            <span className="font-medium">Apagar todos os dados</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Sobre</h3>
        </div>
        <div className="p-4 text-sm text-gray-600">
          <p>DebtFlow Control v1.0</p>
          <p className="mt-2">Um aplicativo simples e funcional para controle financeiro pessoal.</p>
        </div>
      </div>
    </div>
  );
};

// --- Reminder Modal Component ---
interface ReminderModalProps {
  installment: Installment;
  debtName: string;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ installment, debtName, onClose, onSave }) => {
  const [date, setDate] = useState(installment.dueDate);
  const [time, setTime] = useState('09:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(date, time);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Definir Lembrete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Configurar lembrete para a parcela <strong>#{installment.number}</strong> de <strong>{debtName}</strong>.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Lembrete</label>
            <input 
              type="date" 
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
            <input 
              type="time" 
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="pt-2 text-xs text-gray-400 text-center">
            Isso abrirá o Google Agenda para salvar o evento.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm">
              Criar Lembrete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setDebts(getDebts());
  };

  const getSummary = (): DashboardSummary => {
    let totalDebt = 0;
    let totalPaid = 0;

    debts.forEach(d => {
      totalDebt += d.totalValue;
      // Total Paid = Down Payment + Sum of Paid Installments
      const installmentsPaidValue = d.installments.filter(i => i.isPaid).reduce((sum, i) => sum + i.value, 0);
      totalPaid += (d.downPayment || 0) + installmentsPaidValue;
    });

    return {
      totalDebt,
      totalPaid,
      totalRemaining: totalDebt - totalPaid,
      monthlyCommitment: 0,
      debtsCount: debts.length
    };
  };

  const summary = getSummary();

  // --- Calculate Overdue Installments ---
  const today = new Date().toISOString().split('T')[0];
  const overdueItems = debts.flatMap(d => 
    d.installments
      .filter(i => !i.isPaid && i.dueDate < today)
      .map(i => ({
        ...i,
        debtName: d.description,
        debtId: d.id
      }))
  );
  
  const totalOverdueValue = overdueItems.reduce((acc, curr) => acc + curr.value, 0);

  // --- Calculations for Progress Chart ---
  const totalInstallmentsCount = debts.reduce((acc, d) => acc + d.totalInstallments, 0);
  const totalPaidInstallmentsCount = debts.reduce((acc, d) => acc + d.installments.filter(i => i.isPaid).length, 0);
  const progressPercentage = totalInstallmentsCount > 0 
    ? Math.round((totalPaidInstallmentsCount / totalInstallmentsCount) * 100) 
    : 0;
  
  const chartData = [
    { name: 'Pago', value: totalPaidInstallmentsCount },
    { name: 'Restante', value: totalInstallmentsCount - totalPaidInstallmentsCount }
  ];
  // Cores atualizadas conforme solicitação: Verde (Pago) e Vermelho (Restante)
  const CHART_COLORS = ['#22c55e', '#ef4444']; 

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const advice = await analyzeDebtsWithGemini(debts);
    setAiAdvice(advice);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Meus Controle Financeiro</h1>
           <p className="text-gray-500">Visão geral da sua saúde financeira</p>
        </div>
      </div>

      {/* Overdue Alert Notification */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white p-2.5 rounded-full shadow-sm text-red-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-lg">Atenção: Parcelas Atrasadas!</h3>
            <p className="text-red-700 text-sm mt-1">
              Você possui <span className="font-bold">{overdueItems.length}</span> parcelas vencidas totalizando <span className="font-bold bg-red-100 px-1.5 py-0.5 rounded text-red-700">{formatCurrency(totalOverdueValue)}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {overdueItems.slice(0, 3).map((item) => (
                <span key={`${item.debtId}-${item.id}`} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-red-700 border border-red-100 shadow-sm">
                  {item.debtName} - {formatCurrency(item.value)}
                </span>
              ))}
              {overdueItems.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-red-600">
                  e mais {overdueItems.length - 3}...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Row: Progress Chart & AI */}
      {debts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Circular Progress Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-gray-500 font-bold uppercase text-xs mb-6 tracking-wider w-full text-center">Progresso Total</h3>
                <div className="w-full h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                        paddingAngle={2}
                        >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                        </Pie>
                    </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Percentage */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-bold text-gray-900">{progressPercentage}%</span>
                    <span className="text-xs font-medium text-gray-400 uppercase mt-1">Quitado</span>
                    </div>
                </div>
                
                {/* Legend */}
                <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600 font-medium">Pago</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600 font-medium">Restante</span>
                    </div>
                </div>
            </div>

            {/* AI Advisor */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                        <h3 className="font-bold text-gray-900">Consultor Inteligente</h3>
                        <p className="text-xs text-gray-500">Análise de prioridades baseada em IA</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAiAnalysis} 
                        disabled={loadingAi}
                        className="text-sm bg-white text-indigo-700 font-medium px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm whitespace-nowrap"
                    >
                        {loadingAi ? 'Analisando...' : 'Gerar Análise'}
                    </button>
                </div>
                
                <div className="flex-1 bg-white p-5 rounded-xl border border-indigo-100 text-indigo-900 text-sm leading-relaxed shadow-sm">
                    {aiAdvice ? aiAdvice : (
                        <p className="text-gray-400 italic text-center py-4">
                            Clique em "Gerar Análise" para receber dicas personalizadas sobre qual dívida priorizar.
                        </p>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
            <h2 className="text-lg font-bold text-gray-700">Bem-vindo ao DebtFlow</h2>
            <p className="text-gray-500 mt-2">Cadastre sua primeira dívida abaixo para ver os gráficos.</p>
        </div>
      )}

      {/* Main Content Area - List */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Debt List */}
        <div>
           <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
             <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
             Minhas Dívidas
           </h2>
           
           {debts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">Nenhuma dívida cadastrada.</p>
                <p className="text-sm text-gray-400 mt-2">Toque no botão central "+" para começar.</p>
              </div>
           ) : (
             <div className="space-y-4">
               {debts.map(debt => {
                 const status = calculateDebtStatus(debt);
                 const paidCount = debt.installments.filter(i => i.isPaid).length;
                 const nextInstallment = debt.installments.find(i => !i.isPaid);
                 const progressPercent = Math.round((paidCount / debt.totalInstallments) * 100);
                 
                 return (
                   <div key={debt.id} 
                        onClick={() => navigate(`/debt/${debt.id}`)}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden relative">
                     
                     <div className="p-5">
                       <div className="flex justify-between items-start mb-4">
                         <div className="pr-4 flex-1">
                           <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition truncate">{debt.description}</h3>
                           <p className="text-sm text-gray-500 mt-1">Total: <span className="font-bold text-gray-800">{formatCurrency(debt.totalValue)}</span></p>
                         </div>
                         <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                           status === DebtStatus.LATE ? 'bg-red-50 text-red-700 border-red-100' :
                           status === DebtStatus.PAID_OFF ? 'bg-green-50 text-green-700 border-green-100' :
                           'bg-blue-50 text-blue-700 border-blue-100'
                         }`}>
                           {status}
                         </span>
                       </div>

                       {/* The Key Fields Grid Summary */}
                       <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Parcelas Pagas</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-800">{paidCount}</span>
                                <span className="text-xs text-gray-400">/ {debt.totalInstallments}</span>
                            </div>
                          </div>
                          <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase">Próximo Vencimento</p>
                             <p className={`text-sm font-bold mt-1 ${status === DebtStatus.LATE ? 'text-red-600' : 'text-gray-800'}`}>
                               {nextInstallment ? formatDate(nextInstallment.dueDate) : 'Concluído'}
                             </p>
                          </div>
                       </div>
                       
                       {/* Progress Bar Visual */}
                       <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${status === DebtStatus.PAID_OFF ? 'bg-green-500' : 'bg-brand-500'}`} 
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-gray-500 w-10 text-right">{progressPercent}%</span>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Debt Detail Component ---
const DebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    const allDebts = getDebts();
    const found = allDebts.find(d => d.id === id);
    if (found) setDebt(found);
    else navigate('/');
  }, [id, navigate]);

  const handleToggle = (installmentId: string, currentStatus: boolean) => {
    if (!debt) return;
    const updatedDebt = toggleInstallmentPayment(debt.id, installmentId, !currentStatus);
    if (updatedDebt) setDebt({ ...updatedDebt });
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir esta dívida?")) {
      deleteDebt(debt!.id);
      navigate('/');
    }
  };
  
  const handleSaveReminder = (date: string, time: string) => {
    if (!debt) return;
    const nextInst = debt.installments.find(i => !i.isPaid);
    if (!nextInst) return;

    // 1. Save locally
    const updatedDebt = setInstallmentReminder(debt.id, nextInst.id, `${date}T${time}:00`);
    if(updatedDebt) setDebt({...updatedDebt});
    setShowReminderModal(false);

    // 2. Open Google Calendar
    // Format: YYYYMMDDTHHMMSS
    const startStr = `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00`;
    const endStr = startStr; // 0 duration usually defaults to 1h in GCal or simply start time
    
    const title = encodeURIComponent(`Pagar Parcela ${nextInst.number} - ${debt.description}`);
    const details = encodeURIComponent(`Lembrete de pagamento gerado pelo DebtFlow.\nValor: ${formatCurrency(nextInst.value)}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}`;
    
    window.open(url, '_blank');
  };

  if (!debt) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;

  const status = calculateDebtStatus(debt);
  const paidCount = debt.installments.filter(i => i.isPaid).length;
  const progress = Math.round((paidCount / debt.totalInstallments) * 100);
  const nextInstallment = debt.installments.find(i => !i.isPaid);

  return (
    <div className="max-w-3xl mx-auto pb-4">
      <button onClick={() => navigate('/')} className="mb-6 flex items-center text-gray-500 hover:text-brand-600 font-medium transition group">
        <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Voltar para a Lista
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900">{debt.description}</h1>
            <div className="flex gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                    status === DebtStatus.LATE ? 'bg-red-100 text-red-800 border-red-200' :
                    status === DebtStatus.PAID_OFF ? 'bg-green-100 text-green-800 border-green-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {status}
              </span>
              <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg transition" title="Excluir Dívida">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Valor Total</label>
             <p className="text-xl font-bold text-gray-900">{formatCurrency(debt.totalValue)}</p>
           </div>
           
           {/* Mostra entrada apenas se houver */}
           {debt.downPayment > 0 && (
             <div>
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Entrada</label>
               <p className="text-xl font-bold text-gray-900">{formatCurrency(debt.downPayment)}</p>
             </div>
           )}

           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Parcela</label>
             <p className="text-xl font-bold text-gray-900">{formatCurrency(debt.installmentValue)}</p>
           </div>
           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Parcelas</label>
             <p className="text-xl font-bold text-gray-900">{debt.totalInstallments}</p>
           </div>
           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pagas</label>
             <p className={`text-xl font-bold ${progress === 100 ? 'text-green-600' : 'text-brand-600'}`}>{paidCount}</p>
           </div>
        </div>
      </div>

      {/* Next Installment Action Area */}
      {nextInstallment && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-full text-brand-600 shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                     <h4 className="font-bold text-brand-900 text-sm">Próximo Vencimento: {formatDate(nextInstallment.dueDate)}</h4>
                     <p className="text-brand-700 text-xs mt-0.5">Parcela {nextInstallment.number} de {debt.totalInstallments}</p>
                 </div>
            </div>
            
            <button 
                onClick={() => setShowReminderModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-brand-700 font-medium text-sm rounded-lg border border-brand-200 hover:bg-brand-50 hover:border-brand-300 transition shadow-sm w-full sm:w-auto justify-center"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {nextInstallment.reminder ? 'Lembrete Definido' : 'Definir Lembrete'}
            </button>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Detalhamento das Parcelas</h3>
      <InstallmentList installments={debt.installments} onToggle={handleToggle} />

      {/* Reminder Modal */}
      {showReminderModal && nextInstallment && (
        <ReminderModal 
            installment={nextInstallment} 
            debtName={debt.description}
            onClose={() => setShowReminderModal(false)}
            onSave={handleSaveReminder}
        />
      )}
    </div>
  );
};

// --- Bottom Navigation Component ---
const BottomNavigation = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-1 z-50 h-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-5xl mx-auto px-6 h-full relative flex justify-between items-start pt-2">
        
        {/* Left Tab: Dívidas */}
        <Link to="/" className="flex flex-col items-center gap-1 w-20 group">
          <div className={`p-1.5 rounded-xl transition ${isActive('/') ? 'bg-blue-50' : 'bg-transparent'}`}>
            <svg className={`w-6 h-6 transition ${isActive('/') ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold ${isActive('/') ? 'text-brand-600' : 'text-gray-400'}`}>Dívidas</span>
        </Link>

        {/* Center Floating Button */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-6">
          <Link to="/add" className="flex items-center justify-center w-14 h-14 bg-brand-600 rounded-full text-white shadow-lg shadow-brand-500/40 hover:bg-brand-700 hover:scale-105 transition-all duration-200">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>

        {/* Right Tab: Configurações */}
        <Link to="/settings" className="flex flex-col items-center gap-1 w-20 group">
          <div className={`p-1.5 rounded-xl transition ${isActive('/settings') ? 'bg-blue-50' : 'bg-transparent'}`}>
            <svg className={`w-6 h-6 transition ${isActive('/settings') ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold ${isActive('/settings') ? 'text-brand-600' : 'text-gray-400'}`}>Configurações</span>
        </Link>
      </div>
    </div>
  );
};

// --- Main Layout ---
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900 font-sans pb-24">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-brand-600 text-white p-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">DebtFlow Control</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add" element={<DebtForm onSave={() => window.location.hash = '#/'} onCancel={() => window.location.hash = '#/'} />} />
          <Route path="/debt/:id" element={<DebtDetail />} />
        </Routes>
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}