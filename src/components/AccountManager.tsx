import { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Account, AccountType } from '../types';
import { X, Plus, Pencil, Trash2, Check, CreditCard, Wallet as WalletIcon, Landmark } from 'lucide-react';

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

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name);
    });
  }, [accounts]);

  const resetForm = () => {
    setName('');
    setType('card');
    setBalance('');
    setCurrency('₽');
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
        currency
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
        currency
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

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                  <th className="pb-4 pl-2">Тип</th>
                  <th className="pb-4">Название</th>
                  <th className="pb-4">Баланс</th>
                  <th className="pb-4 text-right pr-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {/* Add Form Row */}
                {isAdding && (
                  <tr className="bg-emerald-50/50">
                    <td className="py-4 pl-2">
                      <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value as AccountType)}
                        className="bg-white border border-neutral-200 rounded-lg text-xs p-1 outline-none"
                      >
                        <option value="card">Карта</option>
                        <option value="bank">Банк</option>
                        <option value="cash">Наличные</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Название"
                        className="bg-white border border-neutral-200 rounded-lg text-xs p-1 w-full outline-none"
                        autoFocus
                      />
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          value={balance} 
                          onChange={(e) => setBalance(e.target.value)}
                          placeholder="0"
                          className="bg-white border border-neutral-200 rounded-lg text-xs p-1 w-20 outline-none"
                        />
                        <span className="text-xs text-neutral-400">₽</span>
                      </div>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={handleAdd} disabled={loading} className="p-1.5 bg-emerald-500 text-white rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={resetForm} className="p-1.5 bg-neutral-200 text-neutral-600 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sortedAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-neutral-50/50 transition-colors">
                    {editingId === acc.id ? (
                      <>
                        <td className="py-4 pl-2">
                          <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value as AccountType)}
                            className="bg-white border border-neutral-200 rounded-lg text-xs p-1 outline-none"
                          >
                            <option value="card">Карта</option>
                            <option value="bank">Банк</option>
                            <option value="cash">Наличные</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white border border-neutral-200 rounded-lg text-xs p-1 w-full outline-none"
                          />
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={balance} 
                              onChange={(e) => setBalance(e.target.value)}
                              className="bg-white border border-neutral-200 rounded-lg text-xs p-1 w-20 outline-none"
                            />
                            <span className="text-xs text-neutral-400">₽</span>
                          </div>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleUpdate(acc.id)} disabled={loading} className="p-1.5 bg-emerald-500 text-white rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={resetForm} className="p-1.5 bg-neutral-200 text-neutral-600 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-2 text-neutral-500">
                            {getIcon(acc.type)}
                            <span className="text-[10px] font-medium uppercase tracking-wider">{getTypeName(acc.type)}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="font-semibold text-sm">{acc.name}</span>
                        </td>
                        <td className="py-4">
                          <span className="font-bold text-sm">{acc.balance.toLocaleString()} {acc.currency}</span>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => startEditing(acc)}
                              className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(acc.id)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
