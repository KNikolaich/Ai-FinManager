import { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Account, AccountType } from '../types';
import { X, Plus, Trash2, Check, CreditCard, Wallet as WalletIcon, Landmark } from 'lucide-react';

interface AccountManagerProps {
  accounts: Account[];
  userId: string;
  onClose: () => void;
}

export default function AccountManager({ accounts, userId, onClose }: AccountManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('card');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('₽');
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [showInTotals, setShowInTotals] = useState(true);

  const groupedAccounts = useMemo(() => {
    const groups: Record<AccountType, Account[]> = {
      card: [],
      bank: [],
      cash: []
    };
    accounts.forEach(acc => groups[acc.type].push(acc));
    return groups;
  }, [accounts]);

  const resetForm = () => {
    setName('');
    setType('card');
    setBalance('');
    setCurrency('₽');
    setShowOnDashboard(true);
    setShowInTotals(true);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'accounts'), {
        userId,
        name,
        type,
        balance: parseFloat(balance),
        currency,
        showOnDashboard,
        showInTotals
      });
      resetForm();
    } catch (error) {
      console.error('Error adding account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name || !balance) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'accounts', id), {
        name,
        type,
        balance: parseFloat(balance),
        currency,
        showOnDashboard,
        showInTotals
      });
      resetForm();
    } catch (error) {
      console.error('Error updating account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот счет? Все связанные операции останутся, но счет будет удален.')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setCurrency(acc.currency);
    setShowOnDashboard(acc.showOnDashboard ?? true);
    setShowInTotals(acc.showInTotals ?? true);
    setIsAdding(false);
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'bank': return <Landmark className="w-4 h-4" />;
      case 'cash': return <WalletIcon className="w-4 h-4" />;
    }
  };

  const getTypeName = (type: AccountType) => {
    switch (type) {
      case 'card': return 'Карта';
      case 'bank': return 'Банк';
      case 'cash': return 'Наличные';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">Управление счетами</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-neutral-500 text-sm">Всего счетов: {accounts.length}</p>
            {!isAdding && !editingId && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-600 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            )}
          </div>

          {isAdding && (
            <form onSubmit={handleAdd} className="bg-neutral-50 p-6 rounded-2xl mb-6 space-y-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Название счета" required />
              <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="w-full border rounded-lg p-2 text-sm">
                <option value="card">Карта</option>
                <option value="bank">Банк</option>
                <option value="cash">Наличные</option>
              </select>
              <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Начальный баланс" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-neutral-200 text-neutral-600 rounded-lg text-sm">Отмена</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold">
                  {loading ? '...' : 'Сохранить'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-6">
            {(['bank', 'card', 'cash'] as AccountType[]).map(type => (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-500 pb-2 border-b border-neutral-100">
                  {getIcon(type)}
                  <span className="text-xs font-bold uppercase tracking-wider">{getTypeName(type)}</span>
                </div>
                
                {groupedAccounts[type].map(acc => (
                  <div key={acc.id} onClick={() => startEditing(acc)} className="p-4 hover:bg-neutral-50 rounded-2xl cursor-pointer transition-colors">
                    {editingId === acc.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="Название" />
                          <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="Баланс" />
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} /> На главном</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={showInTotals} onChange={(e) => setShowInTotals(e.target.checked)} /> В суммах</label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleUpdate(acc.id); }} className="p-2 bg-emerald-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} className="p-2 bg-rose-500 text-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); resetForm(); }} className="p-2 bg-neutral-200 text-neutral-600 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{acc.name}</span>
                        <span className="font-bold text-sm">{acc.balance.toLocaleString()} {acc.currency}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
