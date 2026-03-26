import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Category, OperationType, TransactionType } from '../types';
import { X, Plus, Trash2, Tag, Check, AlertTriangle, ChevronRight, Search } from 'lucide-react';
import { User } from 'firebase/auth';

interface CategoryManagerProps {
  user: User;
  onClose: () => void;
}

const COMMON_ICONS = [
  '💰', '🛒', '🍔', '🚗', '🏠', '🏥', '🎁', '🎓', '✈️', '🎮',
  '📱', '👕', '🧼', '🐾', '💡', '🛠️', '📈', '📉', '🏦', '💳',
  '🍕', '☕', '🍿', '🎬', '🎭', '🎨', '🎤', '🎧', '🎸', '🎹',
  '⚽', '🏀', '🎾', '🏐', '🚴', '🏊', '🏋️', '🧘', '🏕️', '🏖️',
  '🍎', '🥦', '🥩', '🥖', '🥛', '🍷', '🍺', '🍹', '🍦', '🍰',
  '🚌', '🚲', '🚕', '🚂', '🚢', '🚀', '⛽', '🅿️', '🚧', '🗺️',
  '💻', '🖥️', '⌨️', '🖱️', '🔋', '🔌', '📡', '🔒', '🔑', '🔨',
  '📚', '✏️', '📎', '✂️', '📏', '📅', '📌', '🔍', '📢', '🔔',
  '❤️', '⭐', '🔥', '✨', '🌈', '☀️', '🌙', '☁️', '🌧️', '❄️'
];

export default function CategoryManager({ user, onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [user.uid]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      // Sort alphabetically by name
      fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(fetchedCategories);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeleteConfirmId(null);
      setShowFormModal(false);
      fetchCategories();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'categories');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white sm:rounded-3xl shadow-2xl flex flex-col sm:h-[90vh] h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 flex-shrink-0">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Категории</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingCategory(null);
                setShowFormModal(true);
              }}
              className="flex items-center gap-2 bg-emerald-500 text-white p-2 sm:px-4 sm:py-2 rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm shadow-lg shadow-emerald-100"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Добавить</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-neutral-400" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50/50 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
              <p className="text-neutral-400 font-medium">Загрузка категорий...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Expenses Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-rose-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    Расходы
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-neutral-100">
                    {expenseCategories.length} категорий
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-100">
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-12">Иконка</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Название</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {expenseCategories.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-neutral-400 text-sm italic">Нет категорий расходов</td>
                        </tr>
                      ) : (
                        expenseCategories.map(cat => (
                          <tr 
                            key={cat.id} 
                            onClick={() => {
                              setEditingCategory(cat);
                              setShowFormModal(true);
                            }}
                            className="hover:bg-neutral-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-3 text-2xl text-center">{cat.icon}</td>
                            <td className="px-4 py-3 font-semibold text-neutral-700">{cat.name}</td>
                            <td className="px-4 py-3 text-neutral-300 group-hover:text-emerald-500 transition-colors">
                              <ChevronRight size={18} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Income Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-emerald-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Доходы
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-neutral-100">
                    {incomeCategories.length} категорий
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-100">
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-12">Иконка</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Название</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {incomeCategories.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-neutral-400 text-sm italic">Нет категорий доходов</td>
                        </tr>
                      ) : (
                        incomeCategories.map(cat => (
                          <tr 
                            key={cat.id} 
                            onClick={() => {
                              setEditingCategory(cat);
                              setShowFormModal(true);
                            }}
                            className="hover:bg-neutral-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-3 text-2xl text-center">{cat.icon}</td>
                            <td className="px-4 py-3 font-semibold text-neutral-700">{cat.name}</td>
                            <td className="px-4 py-3 text-neutral-300 group-hover:text-emerald-500 transition-colors">
                              <ChevronRight size={18} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Form Modal (Add/Edit) */}
      {showFormModal && (
        <CategoryForm 
          userId={user.uid}
          category={editingCategory}
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false);
            fetchCategories();
          }}
          onDelete={(id) => setDeleteConfirmId(id)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Удалить категорию?</h3>
            <p className="text-neutral-500 mb-6 text-sm">Это действие нельзя будет отменить. Все транзакции в этой категории останутся, но без привязки к категории.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="flex-1 py-3 rounded-2xl bg-neutral-100 font-bold hover:bg-neutral-200 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={() => handleDeleteCategory(deleteConfirmId)} 
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryFormProps {
  userId: string;
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}

function CategoryForm({ userId, category, onClose, onSuccess, onDelete }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '💰');
  const [type, setType] = useState<TransactionType>(category?.type || 'expense');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      if (category) {
        await updateDoc(doc(db, 'categories', category.id), {
          name,
          icon,
          type
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          userId,
          name,
          icon,
          type,
          color: '#000000',
          createdAt: new Date().toISOString()
        });
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white sm:rounded-[32px] rounded-none shadow-2xl overflow-hidden h-full sm:h-auto flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold">{category ? 'Редактировать' : 'Новая категория'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setShowIconPicker(true)}
              className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center text-4xl hover:bg-neutral-100 transition-all border-2 border-dashed border-neutral-200 hover:border-emerald-500 group relative"
            >
              {icon}
              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity flex items-center justify-center">
                <Plus className="text-emerald-600 w-6 h-6" />
              </div>
            </button>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Нажмите, чтобы сменить иконку</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Название</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Продукты"
                className="w-full bg-neutral-50 rounded-2xl px-5 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-semibold transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Тип категории</label>
              <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    type === 'expense' 
                      ? 'bg-white text-rose-500 shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    type === 'income' 
                      ? 'bg-white text-emerald-500 shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Доход
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {category && (
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={24} />
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={20} />
                  {category ? 'Сохранить изменения' : 'Создать категорию'}
                </>
              )}
            </button>
          </div>
        </form>

        {showIconPicker && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold">Выберите иконку</h3>
              <button onClick={() => setShowIconPicker(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              <div className="mb-6 space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Своя иконка (эмодзи)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                    placeholder="Введите эмодзи..."
                    className="flex-1 bg-neutral-50 rounded-2xl px-5 py-4 outline-none focus:ring-2 ring-emerald-500/20 font-semibold transition-all"
                  />
                  <button
                    onClick={() => setShowIconPicker(false)}
                    className="bg-emerald-500 text-white px-6 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                  >
                    Готово
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 gap-4">
                {COMMON_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setIcon(emoji);
                    setShowIconPicker(false);
                  }}
                  className={`aspect-square flex items-center justify-center text-3xl rounded-2xl transition-all hover:scale-110 ${
                    icon === emoji ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}

