import { useMemo, useState } from 'react';
import { Account, Transaction, Goal, Budget, Category } from '../types';
import { Wallet, TrendingUp, TrendingDown, Target, ChevronRight, CreditCard, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import AccountManager from './AccountManager';
import GoalManager from './GoalManager';
import TransactionHistory from './TransactionHistory';
import EditTransaction from './EditTransaction';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  categories: Category[];
  userId: string;
  showTotalBalance: boolean;
}

export default function Dashboard({ accounts, transactions, goals, budgets, categories, userId, showTotalBalance }: DashboardProps) {
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showGoalManager, setShowGoalManager] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const totalBalance = useMemo(() => accounts.filter(a => a.showInTotals).reduce((sum, acc) => sum + acc.balance, 0), [accounts]);
  
  const dashboardAccounts = useMemo(() => accounts.filter(a => a.showOnDashboard), [accounts]);
  
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMonthTransactions = transactions.filter(t => new Date(t.createdAt) >= startOfMonth);
    
    const income = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return { income, expense };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [transactions]);

  const activeGoals = useMemo(() => goals.filter(g => !g.isCompleted), [goals]);

  return (
    <div className="p-1.5 sm:p-2 space-y-6">
      {/* Total Balance Card */}
      {showTotalBalance && (
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100">
          <p className="text-emerald-100 text-sm font-medium mb-1">Общий баланс</p>
          <h2 className="text-4xl font-bold mb-6">{totalBalance.toLocaleString()} ₽</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-100">Доход</p>
                <p className="font-semibold">+{monthlyStats.income.toLocaleString()} ₽</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-100">Расход</p>
                <p className="font-semibold">-{monthlyStats.expense.toLocaleString()} ₽</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Счета</h3>
          <button 
            onClick={() => setShowAccountManager(true)}
            className="text-emerald-600 text-sm font-medium hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
          >
            Все
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1.5 px-1.5 no-scrollbar snap-x snap-mandatory">
          {dashboardAccounts.map(account => {
            const isNegative = account.balance < 0;
            const Icon = account.type === 'card' ? CreditCard : account.type === 'bank' ? Landmark : Wallet;
            
            return (
              <div 
                key={account.id} 
                className={cn(
                  "min-w-[90px] flex-shrink-0 bg-white p-3 rounded-2xl border transition-all duration-300 snap-start",
                  isNegative 
                    ? "shadow-lg shadow-rose-100/60 border-rose-50" 
                    : "shadow-lg shadow-emerald-100/60 border-emerald-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                  isNegative ? "bg-rose-50" : "bg-emerald-50"
                )}>
                  <Icon className={cn("w-4 h-4", isNegative ? "text-rose-500" : "text-emerald-500")} />
                </div>
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-tight mb-0.5 truncate">{account.name}</p>
                <p className={cn("font-bold text-sm truncate", isNegative ? "text-rose-600" : "text-neutral-900")}>
                  {account.balance.toLocaleString()} {account.currency}
                </p>
              </div>
            );
          })}
          {dashboardAccounts.length === 0 && (
            <p className="text-neutral-400 text-sm italic">Нет добавленных счетов</p>
          )}
        </div>
      </section>

      {showAccountManager && (
        <AccountManager 
          accounts={accounts} 
          userId={userId} 
          onClose={() => setShowAccountManager(false)} 
        />
      )}

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Последние операции</h3>
          <button 
            onClick={() => setShowTransactionHistory(true)}
            className="text-emerald-600 text-sm font-medium hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
          >
            Все
          </button>
        </div>
        <div className="space-y-1">
          {recentTransactions.map(t => {
            const category = categories.find(c => c.id === t.categoryId);
            return (
              <div 
                key={t.id} 
                onClick={() => setEditingTransaction(t)}
                className="bg-white p-2 rounded-2xl border border-neutral-100 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: category?.color + '20' }}>
                    {category?.icon || '💰'}
                  </div>
                  <div>
                    <p className="font-semibold text-xs">{t.description || category?.name || 'Без описания'}</p>
                    <p className="text-[10px] text-neutral-400">{format(new Date(t.createdAt), 'd MMMM', { locale: ru })}</p>
                  </div>
                </div>
                <p className={cn("font-bold text-sm", t.type === 'income' ? "text-emerald-600" : "text-neutral-900")}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
                </p>
              </div>
            );
          })}
          {recentTransactions.length === 0 && (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-400 text-sm">Операций пока нет</p>
            </div>
          )}
        </div>
      </section>

      {showTransactionHistory && (
        <TransactionHistory 
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          onClose={() => setShowTransactionHistory(false)}
          onEditTransaction={(t) => {
            setEditingTransaction(t);
          }}
        />
      )}

      {editingTransaction && (
        <EditTransaction 
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Goals Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Цели</h3>
          <button onClick={() => setShowGoalManager(true)} className="text-emerald-600 text-sm font-medium">Все</button>
        </div>
        <div className="space-y-4">
          {activeGoals.map(goal => (
            <div key={goal.id} className="bg-white p-4 rounded-2xl border border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{goal.name}</span>
                <span className="text-xs text-neutral-400">{goal.deadline}</span>
              </div>
            </div>
          ))}
          {activeGoals.length === 0 && (
            <p className="text-neutral-400 text-sm italic">Нет активных целей</p>
          )}
        </div>
      </section>

      {showGoalManager && (
        <GoalManager 
          goals={goals} 
          userId={userId} 
          onClose={() => setShowGoalManager(false)} 
        />
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
