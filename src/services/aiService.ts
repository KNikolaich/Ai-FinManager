import { GoogleGenAI, Type } from "@google/genai";
import { Account, Category, Transaction, Goal, Budget, Plan, Message } from "../types";
import { db } from "../firebase";
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, limit } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AIResponse {
  intent: 'transaction' | 'goal' | 'plan' | 'advice' | 'unknown';
  data: any;
  message: string;
}

const logAIInteraction = async (userId: string, request: any, response: any) => {
  if (!userId) return;
  try {
    // Add new log
    await addDoc(collection(db, 'ai_logs'), {
      userId,
      request,
      response,
      createdAt: new Date().toISOString()
    });

    // Prune old logs (keep last 100)
    const q = query(
      collection(db, 'ai_logs'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.size > 100) {
      const toDelete = snapshot.docs.slice(100);
      await Promise.all(toDelete.map(d => deleteDoc(doc(db, 'ai_logs', d.id))));
    }
  } catch (error) {
    console.error('Error logging AI interaction:', error);
  }
};

export const processUserMessage = async (
  userId: string,
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
  
  const mainAccounts = accounts.filter(a => a.showOnDashboard);

  const requestPayload = {
    model: "gemini-3-flash-preview",
    contents: `Conversation history:
    ${historyContext}
    
    User message: "${text}"
    Current date: ${new Date().toISOString()}
    
    REFERENCE DATA (Use these IDs for structured output):
    Main Accounts (isMain/showOnDashboard): ${JSON.stringify(mainAccounts.map(a => ({ id: a.id, name: a.name })))}
    All Categories: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}
    
    Current goals: ${JSON.stringify(goals.map(g => ({ id: g.id, name: g.name, target: g.targetAmount, current: g.currentAmount })))}
    Current plans: ${JSON.stringify(plans.map(p => ({ id: p.id, name: p.name, amount: p.plannedAmount })))}
    
    Determine the user's intent and extract relevant data.
    IMPORTANT: 
    - If the user mentions an account or category by name, you MUST find its corresponding "id" from the REFERENCE DATA above and use that "id" in the data object.
    - EVERY value you mention in your "message" (amount, account name, category name, goal name) MUST be present in the "data" object.
    - If you cannot find a matching ID for an account or category mentioned by the user, set intent to "unknown" and ask for clarification.
    - Only use "transaction", "goal", or "plan" intents if you have ALL required data. If any required field is missing, you MUST set intent to "unknown" and ask a clarifying question in the "message".
    - For transaction intent, required fields in "data" are: type, amount, accountId, accountName, categoryId.
    - For goal intent, required fields in "data" are: name, targetAmount.
    - For plan intent, required fields in "data" are: name, plannedAmount, accountId, accountName.
    - For goal intent, the "message" should be a PROPOSAL to open the goal creation form (e.g., "Я могу открыть форму создания цели для 'Велосипед' на 60000 ₽. Подтвердите?"), NOT a confirmation that it's already done.
    - For transaction or plan intents, the "message" should be a PROPOSAL (e.g., "Я готов записать расход... Подтвердите?"), NOT a confirmation that it's already done. DO NOT use words like "зафиксировано" or "успешно добавлено" in the initial message.
    
    Intents:
    - transaction: adding income, expense, or transfer.
    - goal: creating a new financial goal.
    - plan: creating or updating a financial plan for a month.
    - advice: asking for financial analysis or tips.
    
    Data object requirements per intent:
    - transaction:
        - type: "income", "expense", or "transfer" (required)
        - amount: number (required)
        - accountId: string (required, MUST be the 'id' from available accounts)
        - accountName: string (required, the name of the account)
        - targetAccountId: string (required for transfers)
        - categoryId: string (required, MUST be the 'id' from available categories)
        - description: string (optional)
    - goal:
        - name: string (required, the name of the goal)
        - targetAmount: number (required)
        - deadline: ISO string (optional)
    - plan:
        - name: string (required)
        - plannedAmount: number (required)
        - accountId: string (required, MUST be the 'id' from available accounts)
        - accountName: string (required)
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
          data: { 
            type: Type.OBJECT, 
            nullable: true,
            properties: {
              type: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              plannedAmount: { type: Type.NUMBER },
              targetAmount: { type: Type.NUMBER },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              accountId: { type: Type.STRING },
              accountName: { type: Type.STRING },
              targetAccountId: { type: Type.STRING },
              categoryId: { type: Type.STRING },
              deadline: { type: Type.STRING },
              priority: { type: Type.STRING },
              dateOfFinish: { type: Type.STRING }
            }
          },
          message: { type: Type.STRING }
        },
        required: ["intent", "message"]
      },
      systemInstruction: "Ты — вежливый, краткий и обходительный финансовый ассистент. Твоя задача — помогать пользователю управлять финансами. Отвечай на русском языке. Если видишь, что необходимо создать цель или операцию, возвращай строго типизированный объект со всеми найдеными свойствами операции или цели. Будь настойчив, если необходима консультация по бюджету и видишь проблемы, не стесняйся о них сообщить. Ответ пользователю должен быть лаконичен и точен."
    }
  };

  const response = await ai.models.generateContent(requestPayload);
  const result = JSON.parse(response.text);

  await logAIInteraction(userId, requestPayload, result);

  return result;
};

export const getFinancialAdvice = async (
  userId: string,
  transactions: Transaction[], 
  budgets: Budget[], 
  goals: Goal[],
  accounts: Account[],
  plans: Plan[]
) => {
  const requestPayload = {
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
  };

  const response = await ai.models.generateContent(requestPayload);
  
  await logAIInteraction(userId, requestPayload, { text: response.text });

  return response.text;
};
