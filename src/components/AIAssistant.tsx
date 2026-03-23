import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react';
import { parseTransaction, getFinancialAdvice } from '../services/aiService';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { Account, Category, Transaction, Goal, Budget } from '../types';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'action';
  actionData?: any;
}

export default function AIAssistant({ accounts, categories, transactions, budgets, goals }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я твой финансовый ассистент. Могу помочь добавить операцию, создать цель или проанализировать бюджет. Просто напиши мне!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Logic to determine intent
      if (input.toLowerCase().includes('совет') || input.toLowerCase().includes('анализ')) {
        const advice = await getFinancialAdvice(transactions, budgets, goals);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: advice
        }]);
      } else {
        // Assume transaction parsing
        const parsed = await parseTransaction(input, accounts, categories);
        
        if (parsed.amount && (parsed.accountId || accounts.length > 0)) {
          const accountId = parsed.accountId || accounts[0].id;
          const categoryId = parsed.categoryId || categories.find(c => c.type === parsed.type)?.id || categories[0]?.id;
          
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Я распознал операцию: **${parsed.type === 'income' ? 'Доход' : 'Расход'}** на сумму **${parsed.amount} ₽**. Категория: *${categories.find(c => c.id === categoryId)?.name || 'Неизвестно'}*. Добавить?`,
            type: 'action',
            actionData: { ...parsed, accountId, categoryId }
          };
          setMessages(prev => [...prev, assistantMsg]);
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Не совсем понял. Попробуй написать что-то вроде: "Потратил 500 рублей на такси по карте ВТБ"'
          }]);
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Произошла ошибка при обработке запроса. Попробуй еще раз.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (msgId: string, data: any) => {
    try {
      const transactionData = {
        userId: accounts[0].userId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        createdAt: data.createdAt || new Date().toISOString()
      };

      await addDoc(collection(db, 'transactions'), transactionData);
      
      const accountRef = doc(db, 'accounts', data.accountId);
      await updateDoc(accountRef, {
        balance: increment(data.type === 'income' ? data.amount : -data.amount)
      });

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, type: 'text', content: m.content + '\n\n✅ **Операция успешно добавлена!**' } : m));
    } catch (error) {
      console.error('Confirm error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 px-1.5 sm:px-2 lg:px-6">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              m.role === 'assistant' ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-600"
            )}>
              {m.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="space-y-3 max-w-[80%]">
              <div className={cn(
                "p-4 rounded-2xl text-sm shadow-sm",
                m.role === 'assistant' ? "bg-white text-neutral-800 rounded-tl-none" : "bg-emerald-600 text-white rounded-tr-none"
              )}>
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                  <ReactMarkdown>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
              
              {m.type === 'action' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => confirmAction(m.id, m.actionData)}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    Подтвердить
                  </button>
                  <button 
                    onClick={() => setMessages(prev => prev.filter(msg => msg.id !== m.id))}
                    className="bg-white border border-neutral-200 text-neutral-500 px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span className="text-xs text-neutral-400">Думаю...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setInput('Добавь расход 500р на кофе')}
            className="shrink-0 bg-neutral-50 text-neutral-600 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-100"
          >
            ☕️ Кофе 500р
          </button>
          <button 
            onClick={() => setInput('Дай финансовый совет')}
            className="shrink-0 bg-neutral-50 text-neutral-600 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-100"
          >
            💡 Финансовый совет
          </button>
          <button 
            onClick={() => setInput('Анализ моих трат')}
            className="shrink-0 bg-neutral-50 text-neutral-600 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-100"
          >
            📊 Анализ трат
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Спроси что-нибудь..."
            className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-4 pr-12 py-4 outline-none focus:border-emerald-500 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
