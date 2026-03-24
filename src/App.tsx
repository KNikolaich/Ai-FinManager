import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout, db, handleFirestoreError } from './firebase';
import { collection, onSnapshot, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
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
import { Account, Category, Transaction, Goal, Budget, UserSettings, OperationType, Plan } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({ showTotalBalance: true });
  const [assistantStatus, setAssistantStatus] = useState<'none' | 'warning' | 'alert' | 'nudge'>('none');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Ensure user document exists
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const defaultSettings: UserSettings = { showTotalBalance: true };
            await setDoc(userRef, {
              email: u.email,
              createdAt: new Date().toISOString(),
              settings: defaultSettings
            });
            setUserSettings(defaultSettings);
          } else {
            const data = userSnap.data();
            if (data?.settings) {
              setUserSettings(data.settings);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleTotalBalance = async () => {
    if (!user) return;
    const newSettings = { ...userSettings, showTotalBalance: !userSettings.showTotalBalance };
    setUserSettings(newSettings);
    
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { settings: newSettings }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    if (!user) return;

    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', user.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    });

    const qCategories = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubCategories = onSnapshot(qCategories, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    const qTransactions = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(qGoals, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
    });

    const qBudgets = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const unsubBudgets = onSnapshot(qBudgets, (snap) => {
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });

    const qPlans = query(collection(db, 'plans'), where('userId', '==', user.uid));
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
    });

    return () => {
      unsubAccounts();
      unsubCategories();
      unsubTransactions();
      unsubGoals();
      unsubBudgets();
      unsubPlans();
    };
  }, [user]);

  useEffect(() => {
    if (!goals.length && !plans.length) {
      setAssistantStatus('none');
      return;
    }

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    let status: 'none' | 'warning' | 'alert' | 'nudge' = 'none';

    // Check goals
    goals.forEach(g => {
      if (!g.isCompleted && g.deadline) {
        const deadline = new Date(g.deadline);
        if (deadline < now) status = 'alert';
        else if (deadline < threeDaysFromNow && status !== 'alert') status = 'warning';
      }
    });

    // Check plans
    plans.forEach(p => {
      if (p.dateOfFinish) {
        const deadline = new Date(p.dateOfFinish);
        if (deadline < now) status = 'alert';
        else if (deadline < threeDaysFromNow && status !== 'alert') status = 'warning';
      }
    });

    // Daily Nudge Logic (9:00 and 21:00)
    const currentHour = now.getHours();
    const todayStr = now.toISOString().slice(0, 10);
    const nudgeKey = `${todayStr}-${currentHour >= 21 ? '21' : currentHour >= 9 ? '9' : 'none'}`;
    
    if (status === 'none' && (currentHour === 9 || currentHour === 21) && userSettings.lastNudgeTime !== nudgeKey) {
      status = 'nudge';
    }

    setAssistantStatus(status);
  }, [goals, plans, userSettings.lastNudgeTime]);

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (tab === 'ai' && assistantStatus === 'nudge' && user) {
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().slice(0, 10);
      const nudgeKey = `${todayStr}-${currentHour >= 21 ? '21' : currentHour >= 9 ? '9' : 'none'}`;
      
      const newSettings = { ...userSettings, lastNudgeTime: nudgeKey };
      setUserSettings(newSettings);
      try {
        await setDoc(doc(db, 'users', user.uid), { settings: newSettings }, { merge: true });
      } catch (error) {
        console.error('Failed to update nudge time:', error);
      }
    }
  };

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
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Финансист AI</h1>
        <p className="text-neutral-500 mb-8 max-w-xs">
          Умный помощник для ваших финансов. Управляйте бюджетом голосом и текстом.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border border-neutral-200 text-neutral-700 font-semibold py-3 px-4 rounded-xl shadow-sm hover:bg-neutral-50 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Войти через Google
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard 
          accounts={accounts} 
          transactions={transactions} 
          goals={goals} 
          budgets={budgets} 
          categories={categories} 
          userId={user?.uid || ''} 
          showTotalBalance={userSettings.showTotalBalance}
        />
      );
      case 'transactions': return <Transactions transactions={transactions} categories={categories} accounts={accounts} />;
      case 'add': return <AddTransaction accounts={accounts} categories={categories} onComplete={() => setActiveTab('dashboard')} />;
      case 'analytics': return <Analytics transactions={transactions} categories={categories} accounts={accounts} />;
      case 'ai': return <AIAssistant accounts={accounts} categories={categories} transactions={transactions} budgets={budgets} goals={goals} plans={plans} userId={user?.uid || ''} />;
      case 'settings': return <Settings user={user} onLogout={logout} />;
      default: return (
        <Dashboard 
          accounts={accounts} 
          transactions={transactions} 
          goals={goals} 
          budgets={budgets} 
          categories={categories} 
          userId={user?.uid || ''} 
          showTotalBalance={userSettings.showTotalBalance}
        />
      );
    }
  };

  const navItems: { id: string; icon: any; label: string; primary?: boolean; status?: 'none' | 'warning' | 'alert' | 'nudge' }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Обзор' },
    { id: 'transactions', icon: ArrowLeftRight, label: 'Операции' },
    { id: 'add', icon: PlusCircle, label: 'Добавить', primary: true },
    { id: 'analytics', icon: PieChart, label: 'Анализ' },
    { id: 'ai', icon: Bot, label: 'AI', status: assistantStatus },
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      {/* Header */}
      <header className="px-1.5 sm:px-2 lg:px-6 py-2 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTotalBalance}
            className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all"
          >
            <LayoutDashboard className="w-4 h-4 text-white" />
          </button>
          <span className="font-bold text-base">Финансист AI</span>
        </div>
        <button onClick={() => setActiveTab('settings')} className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors">
          <UserIcon className="w-4 h-4 text-neutral-600" />
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
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative",
              activeTab === item.id ? "text-emerald-600" : "text-neutral-400 hover:text-neutral-600",
              item.primary && "relative -top-6 bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95",
              item.id === 'ai' && (item.status === 'warning' || item.status === 'nudge') && "animate-pulse text-amber-500",
              item.id === 'ai' && item.status === 'alert' && "text-rose-500"
            )}
          >
            <item.icon className={cn("w-6 h-6", item.primary && "w-7 h-7")} />
            {item.id === 'ai' && item.status !== 'none' && (
              <span className={cn(
                "absolute top-2 right-2 w-2 h-2 rounded-full",
                item.status === 'alert' ? "bg-rose-500" : "bg-amber-500"
              )} />
            )}
            {!item.primary && <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
