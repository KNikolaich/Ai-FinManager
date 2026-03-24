import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PlusCircle, 
  PieChart, 
  Bot, 
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import AddTransaction from './components/AddTransaction';
import Analytics from './components/Analytics';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import { Account, Category, Transaction, Goal, Budget } from './types';
import { registerUser, loginUser } from './services/customAuthService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        const newUser = await registerUser(email, password);
        setUser(newUser);
      } else {
        const loggedInUser = await loginUser(email, password);
        setUser(loggedInUser);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setAuthError(error.message || 'Произошла ошибка при аутентификации');
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (!user?.id) return;

      const [
        { data: accountsData },
        { data: categoriesData },
        { data: transactionsData },
        { data: goalsData },
        { data: budgetsData }
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('userId', user.id),
        supabase.from('categories').select('*').eq('userId', user.id),
        supabase.from('transactions').select('*').eq('userId', user.id),
        supabase.from('goals').select('*').eq('userId', user.id),
        supabase.from('budgets').select('*').eq('userId', user.id),
      ]);

      if (accountsData) setAccounts(accountsData as Account[]);
      if (categoriesData) setCategories(categoriesData as Category[]);
      if (transactionsData) setTransactions(transactionsData as Transaction[]);
      if (goalsData) setGoals(goalsData as Goal[]);
      if (budgetsData) setBudgets(budgetsData as Budget[]);
    };

    fetchData();

    // Real-time subscriptions
    const channels = [
      supabase.channel('accounts').on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `userId=eq.${user.id}` }, fetchData).subscribe(),
      supabase.channel('categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `userId=eq.${user.id}` }, fetchData).subscribe(),
      supabase.channel('transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `userId=eq.${user.id}` }, fetchData).subscribe(),
      supabase.channel('goals').on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `userId=eq.${user.id}` }, fetchData).subscribe(),
      supabase.channel('budgets').on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `userId=eq.${user.id}` }, fetchData).subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-50 px-6 text-center">
        <div className="mb-8 p-4 bg-emerald-100 rounded-full">
          <LayoutDashboard className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">FinAI Manager</h1>
        <form onSubmit={handleAuth} className="w-full max-w-xs flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="p-3 rounded-xl border border-neutral-200"
            required
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="p-3 rounded-xl border border-neutral-200"
            required
          />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" disabled={isSubmitting} className="bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Загрузка...' : (isSignUp ? 'Зарегистрироваться' : 'Войти')}
          </button>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-600 text-sm">
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </form>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard accounts={accounts} transactions={transactions} goals={goals} budgets={budgets} categories={categories} userId={user?.id || ''} />;
      case 'transactions': return <Transactions transactions={transactions} categories={categories} accounts={accounts} />;
      case 'add': return <AddTransaction accounts={accounts} categories={categories} onComplete={() => setActiveTab('dashboard')} />;
      case 'analytics': return <Analytics transactions={transactions} categories={categories} accounts={accounts} />;
      case 'ai': return <AIAssistant accounts={accounts} categories={categories} transactions={transactions} budgets={budgets} goals={goals} />;
      case 'settings': return <Settings user={user as any} onLogout={logout} />;
      default: return <Dashboard accounts={accounts} transactions={transactions} goals={goals} budgets={budgets} categories={categories} userId={user?.id || ''} />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Обзор' },
    { id: 'transactions', icon: ArrowLeftRight, label: 'Операции' },
    { id: 'add', icon: PlusCircle, label: 'Добавить', primary: true },
    { id: 'analytics', icon: PieChart, label: 'Анализ' },
    { id: 'ai', icon: Bot, label: 'AI' },
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      {/* Header */}
      <header className="px-1.5 sm:px-2 lg:px-6 py-4 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">FinAI</span>
        </div>
        <button onClick={() => setActiveTab('settings')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
          <UserIcon className="w-5 h-5 text-neutral-600" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-neutral-100 px-4 py-2 flex items-center justify-around shrink-0 pb-safe relative z-10">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              activeTab === item.id ? "text-emerald-600" : "text-neutral-400 hover:text-neutral-600",
              item.primary && "relative -top-6 bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95"
            )}
          >
            <item.icon className={cn("w-6 h-6", item.primary && "w-7 h-7")} />
            {!item.primary && <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

