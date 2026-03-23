import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const parseTransaction = async (text: string, accounts: any[], categories: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following financial transaction text: "${text}".
    Available accounts: ${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name })))}
    Available categories: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}
    Current date: ${new Date().toISOString()}
    
    Return a JSON object with:
    - type: "income" or "expense"
    - amount: number
    - accountId: string (match from available accounts if possible, otherwise null)
    - categoryId: string (match from available categories if possible, otherwise null)
    - description: string
    - createdAt: ISO string
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["income", "expense"] },
          amount: { type: Type.NUMBER },
          accountId: { type: Type.STRING, nullable: true },
          categoryId: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING },
          createdAt: { type: Type.STRING }
        },
        required: ["type", "amount", "description", "createdAt"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const getFinancialAdvice = async (transactions: any[], budgets: any[], goals: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these finances and give 3 short, actionable tips in Russian:
    Transactions: ${JSON.stringify(transactions.slice(0, 20))}
    Budgets: ${JSON.stringify(budgets)}
    Goals: ${JSON.stringify(goals)}
    `,
    config: {
      systemInstruction: "You are a helpful financial assistant. Give advice in Russian. Be concise and professional."
    }
  });

  return response.text;
};
