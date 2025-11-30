import { GoogleGenAI } from "@google/genai";
import { Debt } from "../types";

export const analyzeDebtsWithGemini = async (debts: Debt[]): Promise<string> => {
  // The API key is guaranteed to be in process.env.API_KEY per environment configuration
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a concise summary for the AI
  const summary = debts.map(d => ({
    descricao: d.description,
    valor_total: d.totalValue,
    parcelas_restantes: d.installments.filter(i => !i.isPaid).length,
    proximo_vencimento: d.installments.find(i => !i.isPaid)?.dueDate || 'N/A',
    status: calculateStatusLabel(d)
  }));

  const prompt = `
    Atue como um consultor financeiro pessoal. Analise a lista de dívidas abaixo.
    
    Objetivo: Forneça um plano de ação curto e motivador (máximo 3 frases) focado em qual dívida priorizar pagar primeiro.
    Considere datas de vencimento e status.
    
    Dados:
    ${JSON.stringify(summary, null, 2)}
    
    Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // Access the text property directly
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O consultor virtual está indisponível no momento. Tente novamente mais tarde.";
  }
};

function calculateStatusLabel(debt: Debt) {
  const allPaid = debt.installments.every(i => i.isPaid);
  if (allPaid) return 'Quitada';
  const today = new Date().toISOString().split('T')[0];
  const hasLate = debt.installments.some(i => !i.isPaid && i.dueDate < today);
  return hasLate ? 'Atrasada' : 'Em dia';
}