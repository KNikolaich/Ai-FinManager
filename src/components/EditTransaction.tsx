import { useState } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, deleteDoc, increment } from 'firebase/firestore';
import { Transaction, Account, Category } from '../types';
import { X, Trash2, Check, CreditCard, Wallet, Landmark, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EditTransactionProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
}

export default function EditTransaction({ transaction, accounts, categories, onClose }: EditTransactionProps) {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [description, setDescription] = useState(transaction.description);
  const [selectedAccountId, setSelectedAccountId] = useState(transaction.accountId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.categoryId);
  const [date, setDate] = useState(format(new Date(transaction.createdAt), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdate = async () => {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    try {
      const oldAmount = transaction.amount;
      const newAmount = Number(amount);
      const diff = newAmount - oldAmount;

      const transactionRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transactionRef, {
        amount: newAmount,
        description,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        createdAt: new Date(date).toISOString(),
      });

      // If account changed, we need to adjust both
      if (selectedAccountId !== transaction.accountId) {
        const oldAccRef = doc(db, 'accounts', transaction.accountId);
        const newAccRef = doc(db, 'accounts', selectedAccountId);
        
        // Reverse old transaction impact
        await updateDoc(oldAccRef, {
          balance: increment(transaction.type === 'expense' ? oldAmount : -oldAmount)
        });
        
        // Apply new transaction impact
        await updateDoc(newAccRef, {
          balance: increment(transaction.type === 'expense' ? -newAmount : newAmount)
        });
      } else if (diff !== 0) {
        // Same account, just different amount
        const accRef = doc(db, 'accounts', transaction.accountId);
        await updateDoc(accRef, {
          balance: increment(transaction.type === 'expense' ? -diff : diff)
        });
      }

      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      await deleteDoc(transactionRef);

      const accRef = doc(db, 'accounts', transaction.accountId);
      await updateDoc(accRef, {
        balance: increment(transaction.type === 'expense' ? transaction.amount : -transaction.amount)
      });

      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[70] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Удалить операцию?</h3>
            <p className="text-neutral-500 mb-8">Это действие нельзя будет отменить. Баланс счета будет автоматически пересчитан.</p>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Удаление..." : "Да, удалить"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="w-full bg-neutral-100 text-neutral-600 font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-all active:scale-95"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">Редактировать операцию</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Amount Input */}
          <div className="text-center space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Сумма</label>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-4xl font-bold text-center w-full outline-none bg-transparent text-neutral-900"
                placeholder="0"
                autoFocus
              />
              <span className="text-4xl font-bold text-neutral-400">₽</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="На что потратили?"
              className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Date */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Дата</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-50 border-none rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Счет</label>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
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
                  {acc.type === 'card' ? <CreditCard className="w-4 h-4" /> : acc.type === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                  <span className="font-semibold text-sm">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Категория</label>
            <div className="grid grid-cols-4 gap-4">
              {categories.filter(c => c.type === transaction.type).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all",
                    selectedCategoryId === cat.id 
                      ? "border-emerald-500 bg-emerald-50" 
                      : "border-neutral-50 bg-neutral-50 grayscale opacity-60"
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-neutral-50 flex gap-3 shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Удалить
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-6 h-6" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
