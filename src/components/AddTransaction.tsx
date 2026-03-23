import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, increment, writeBatch } from 'firebase/firestore';
import { Account, Category, TransactionType } from '../types';
import { X, Plus, CreditCard, Wallet as WalletIcon, Landmark, ArrowRightLeft, Tag } from 'lucide-react';

interface AddTransactionProps {
  accounts: Account[];
  categories: Category[];
  onComplete: () => void;
}

type ExtendedTransactionType = TransactionType | 'transfer';

export default function AddTransaction({ accounts, categories, onComplete }: AddTransactionProps) {
  const [type, setType] = useState<ExtendedTransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedAccountId) return;
    if (type !== 'transfer' && !selectedCategoryId) return;
    if (type === 'transfer' && selectedAccountId === selectedTargetAccountId) return;

    setLoading(true);
    try {
      const numAmount = parseFloat(amount);
      
      if (type === 'transfer') {
        const batch = writeBatch(db);
        const sourceRef = doc(db, 'accounts', selectedAccountId);
        const targetRef = doc(db, 'accounts', selectedTargetAccountId);
        
        batch.update(sourceRef, { balance: increment(-numAmount) });
        batch.update(targetRef, { balance: increment(numAmount) });
        
        await batch.commit();
      } else {
        const transactionData = {
          userId: accounts.find(a => a.id === selectedAccountId)?.userId,
          accountId: selectedAccountId,
          categoryId: selectedCategoryId,
          amount: numAmount,
          type,
          description,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'transactions'), transactionData);
        
        const accountRef = doc(db, 'accounts', selectedAccountId);
        await updateDoc(accountRef, {
          balance: increment(type === 'income' ? numAmount : -numAmount)
        });
      }

      onComplete();
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  
  const getPlaceholder = () => {
    switch (type) {
      case 'expense': return 'На что потратили?';
      case 'income': return 'Откуда доход?';
      case 'transfer': return 'Комментарий к переводу';
      default: return 'Описание';
    }
  };

  return (
    <div className="p-1.5 sm:p-2 lg:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Новая операция</h2>
        <button onClick={onComplete} className="p-2 hover:bg-neutral-100 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        {/* Type Toggle */}
        <div className="flex bg-neutral-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              type === 'expense' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            )}
          >
            Расход
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-500"
            )}
          >
            Доход
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              type === 'transfer' ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500"
            )}
          >
            Перевод
          </button>
        </div>

        {/* Amount Input */}
        <div className="text-center">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="text-5xl font-bold text-center w-full bg-transparent outline-none placeholder:text-neutral-200"
            autoFocus
          />
          <p className="text-neutral-400 font-medium mt-2">Российский рубль (₽)</p>
        </div>

        {/* Account Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            {type === 'transfer' ? 'Счет списания' : 'Счет'}
          </label>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1.5 sm:-mx-2 lg:-mx-6 px-1.5 sm:px-2 lg:px-6 snap-x snap-mandatory">
            {accounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id)}
                className={cn(
                  "shrink-0 px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all snap-start",
                  selectedAccountId === acc.id 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                    : "border-neutral-100 bg-white text-neutral-600"
                )}
              >
                {acc.type === 'card' ? <CreditCard className="w-4 h-4" /> : acc.type === 'bank' ? <Landmark className="w-4 h-4" /> : <WalletIcon className="w-4 h-4" />}
                <span className="font-semibold text-sm">{acc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {type === 'transfer' ? (
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Счет зачисления</label>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1.5 sm:-mx-2 lg:-mx-6 px-1.5 sm:px-2 lg:px-6 snap-x snap-mandatory">
              {accounts.filter(a => a.id !== selectedAccountId).map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedTargetAccountId(acc.id)}
                  className={cn(
                    "shrink-0 px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all snap-start",
                    selectedTargetAccountId === acc.id 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-neutral-100 bg-white text-neutral-600"
                  )}
                >
                  {acc.type === 'card' ? <CreditCard className="w-4 h-4" /> : acc.type === 'bank' ? <Landmark className="w-4 h-4" /> : <WalletIcon className="w-4 h-4" />}
                  <span className="font-semibold text-sm">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Category Selection */
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Категория</label>
            <div className="grid grid-cols-4 gap-4">
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setDescription(`${cat.name}: `);
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all",
                      selectedCategoryId === cat.id ? "ring-2 ring-emerald-500 ring-offset-2" : ""
                    )}
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <span className={cn("text-[10px] font-medium text-center truncate w-full", selectedCategoryId === cat.id ? "text-emerald-600 font-bold" : "text-neutral-500")}>
                    {cat.name}
                  </span>
                </button>
              ))}
              <button 
                type="button" 
                onClick={() => setSelectedCategoryId('')}
                className="flex flex-col items-center gap-2"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl border-2 border-dashed flex items-center justify-center text-neutral-300",
                  selectedCategoryId === '' ? "border-emerald-500 bg-emerald-50" : "border-neutral-200"
                )}>
                  <Tag className="w-6 h-6" />
                </div>
                <span className={cn("text-[10px] font-medium text-center truncate w-full", selectedCategoryId === '' ? "text-emerald-600 font-bold" : "text-neutral-400")}>
                  Все
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Описание</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full bg-white border border-neutral-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !amount || (type !== 'transfer' && !selectedCategoryId)}
          className={cn(
            "w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none",
            type === 'expense' ? "bg-rose-500 shadow-rose-100" : type === 'income' ? "bg-emerald-500 shadow-emerald-100" : "bg-blue-500 shadow-blue-100"
          )}
        >
          {loading ? 'Сохранение...' : 'Готово'}
        </button>
      </form>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
