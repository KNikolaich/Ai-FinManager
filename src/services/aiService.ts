import { GoogleGenAI, Type } from "@google/genai";
import { Account, Category, Transaction, Goal, Budget, Plan, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AIResponse {
  intent: 'transaction' | 'goal' | 'plan' | 'advice' | 'unknown';
  data: any;
  message: string;
}

export const processUserMessage = async (
  text: string, 
  history: Message[],
  accounts: Account[], 
  categories: Category[], 
  transactions: Transaction[], 
  goals: Goal[], 
  budgets: Budget[],
  plans: Plan[]
): Promise<AIResponse> => {
  const historyContext = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Conversation history:
    ${historyContext}
    
    User message: "${text}"
    Current date: ${new Date().toISOString()}
    Available accounts (use 'id' for accountId): ${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name })))}
    Available categories (use 'id' for categoryId): ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}
    Current goals: ${JSON.stringify(goals.map(g => ({ id: g.id, name: g.name, target: g.targetAmount, current: g.currentAmount })))}
    Current plans: ${JSON.stringify(plans.map(p => ({ id: p.id, name: p.name, amount: p.plannedAmount })))}
    
    Determine the user's intent and extract relevant data.
    IMPORTANT: 
    - If the user mentions an account or category by name, you MUST find its corresponding "id" from the lists above and use that "id" in the data object.
    - If the user wants to add a transaction but didn't specify WHICH account (and you cannot unambiguously match it by name), set intent to "unknown" and ask the user to clarify which account to use in the message.
    - For transaction, goal, or plan intents, the "message" should be a PROPOSAL (e.g., "Я готов записать расход... Подтвердите?"), NOT a confirmation that it's already done. DO NOT use words like "зафиксировано" or "успешно добавлено" in the initial message.
    - Only use "transaction", "goal", or "plan" intents if you have ALL required data (especially accountId for transactions and plans).
    
    Intents:
    - transaction: adding income, expense, or transfer.
    - goal: creating a new financial goal.
    - plan: creating or updating a financial plan for a month.
    - advice: asking for financial analysis or tips.
    
    For transactions:
    - type: "income", "expense", or "transfer" (required)
    - amount: number (required)
    - accountId: string (required, MUST be the 'id' from available accounts)
    - targetAccountId: string (required for transfers, MUST be the 'id' from available accounts)
    - categoryId: string (required, MUST be the 'id' from available categories)
    - description: string (optional)
    
    For goals:
    - name: string (required)
    - targetAmount: number (required)
    - deadline: ISO string (optional)
    
    For plans:
    - name: string (required)
    - plannedAmount: number (required)
    - accountId: string (required, match from available accounts)
    - priority: "low", "medium", "high"
    - dateOfFinish: ISO string
    
    Return a JSON object with:
    - intent: string
    - data: object (the extracted data. Ensure all required fields for the intent are present. If missing, set intent to "unknown")
    - message: string (a concise, polite, and helpful response in Russian confirming what you understood)
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ["transaction", "goal", "plan", "advice", "unknown"] },
          data: { type: Type.OBJECT, nullable: true },
          message: { type: Type.STRING }
        },
        required: ["intent", "message"]
      },
      systemInstruction: "Ты — вежливый, краткий и обходительный финансовый ассистент. Твоя задача — помогать пользователю управлять финансами. Отвечай на русском языке. Будь настойчив, если видишь проблемы в бюджете."
    }
  });

  return JSON.parse(response.text);
};

export const getFinancialAdvice = async (
  transactions: Transaction[], 
  budgets: Budget[], 
  goals: Goal[],
  accounts: Account[],
  plans: Plan[]
) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Проанализируй финансы пользователя и дай 3 кратких совета на русском языке.
    Транзакции за последний месяц: ${JSON.stringify(transactions.slice(0, 30))}
    Бюджеты: ${JSON.stringify(budgets)}
    Цели: ${JSON.stringify(goals)}
    Счета: ${JSON.stringify(accounts)}
    Планы: ${JSON.stringify(plans)}
    
    Обрати внимание на:
    - Превышение бюджета
    - Снижение баланса
    - Отсутствие накоплений
    - Несоответствие планов и целей
    `,
    config: {
      systemInstruction: "Ты — профессиональный финансовый консультант. Твои советы должны быть конкретными, вежливыми и краткими. Используй Markdown для форматирования."
    }
  });

  return response.text;
};
