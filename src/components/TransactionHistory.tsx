import { useMemo, useState } from 'react';
import { Transaction, Category, Account } from '../types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { X, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export default function TransactionHistory({ transactions, categories, accounts, onClose, onEditTransaction }: TransactionHistoryProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string | 'all'>('all');
  const [showFilter, setShowFilter] = useState(false);

  const monthTransactions = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return transactions
      .filter(t => {
        const date = new Date(t.createdAt);
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesCategory = filterCategoryId === 'all' || t.categoryId === filterCategoryId;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [monthTransactions, searchQuery, filterType, filterCategoryId, categories]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, total: income - expense };
  }, [filteredTransactions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full h-full sm:max-w-2xl bg-white shadow-2xl flex flex-col relative">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">История операций</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        {/* Month Selector */}
        <div className="p-4 bg-neutral-50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-2 hover:bg-white rounded-xl transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold capitalize">{format(selectedMonth, 'LLLL yyyy', { locale: ru })}</p>
              <div className="flex gap-4 mt-1">
                <span className="text-[10px] font-bold text-emerald-600">+{stats.income.toLocaleString()} ₽</span>
                <span className="text-[10px] font-bold text-rose-500">-{stats.expense.toLocaleString()} ₽</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-2 hover:bg-white rounded-xl transition-all"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          {/* Search and Type Filter */}
          <div className="space-y-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по описанию или категории..."
              className="w-full p-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex bg-neutral-100 rounded-xl p-1">
              {(['all', 'expense', 'income'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    filterType === type ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"
                  )}
                >
                  {type === 'all' ? 'Все' : type === 'expense' ? 'Расход' : 'Доход'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-20 shadow-sm">
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Дата</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span>Категория / Описание</span>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFilter(!showFilter);
                        }}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          filterCategoryId !== 'all' ? "bg-emerald-100 text-emerald-600" : "hover:bg-neutral-100 text-neutral-400"
                        )}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                      
                      {showFilter && (
                        <div className="absolute left-0 mt-2 w-48 bg-white border border-neutral-100 rounded-xl shadow-xl z-30 py-2">
                          <button 
                            onClick={() => { setFilterCategoryId('all'); setShowFilter(false); }}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 font-bold"
                          >
                            Все категории
                          </button>
                          {categories.map(cat => (
                            <button 
                              key={cat.id}
                              onClick={() => { setFilterCategoryId(cat.id); setShowFilter(false); }}
                              className={cn(
                                "w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 flex items-center gap-2",
                                filterCategoryId === cat.id ? "text-emerald-600 font-bold" : "text-neutral-600"
                              )}
                            >
                              <span>{cat.icon}</span>
                              <span className="truncate">{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <tr 
                    key={t.id} 
                    onClick={() => onEditTransaction(t)}
                    className="hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-neutral-900">{format(new Date(t.createdAt), 'dd.MM')}</p>
                      <p className="text-[10px] text-neutral-400">{format(new Date(t.createdAt), 'HH:mm')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category?.icon || '💰'}</span>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 truncate max-w-[120px]">{t.description || category?.name || 'Без описания'}</p>
                          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{account?.name || 'Счет'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={cn("text-xs font-bold", t.type === 'income' ? "text-emerald-600" : "text-neutral-900")}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {t.type === 'income' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-neutral-300" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <p className="text-sm">В этом месяце операций не было</p>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Итого за период</span>
          <p className={cn("text-lg font-bold", stats.total >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {stats.total >= 0 ? '+' : ''}{stats.total.toLocaleString()} ₽
          </p>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
