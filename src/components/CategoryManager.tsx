import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Category } from '../types';
import { X, Plus, Trash2, Tag, Check, AlertTriangle } from 'lucide-react';
import { User } from 'firebase/auth';

interface CategoryManagerProps {
  user: User;
  onClose: () => void;
}

export default function CategoryManager({ user, onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💰');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        userId: user.uid,
        name: newCategoryName,
        icon: newCategoryIcon,
        type: newCategoryType,
        color: '#000000',
      });
      setNewCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      await updateDoc(doc(db, 'categories', id), { name: editName });
      setEditingId(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xl font-bold">Управление категориями</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории"
              className="w-full bg-neutral-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/20"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="Иконка"
                className="w-16 bg-neutral-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/20 text-center"
              />
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
                className="flex-1 bg-neutral-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/20"
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
              <button
                onClick={handleAddCategory}
                className="bg-emerald-500 text-white p-3 rounded-2xl hover:bg-emerald-600"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-center text-neutral-400">Загрузка...</p>
            ) : (
              categories.map(cat => (
                <div 
                  key={cat.id} 
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl cursor-pointer hover:bg-neutral-100"
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditName(cat.name);
                  }}
                >
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white rounded-lg px-2 py-1 outline-none"
                        autoFocus
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateCategory(cat.id); }} className="text-emerald-500">
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="font-semibold">{cat.name}</span>
                        <span className="text-xs text-neutral-400 bg-neutral-200 px-2 py-1 rounded-lg">{cat.type === 'expense' ? 'Расход' : 'Доход'}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(cat.id); }} 
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Удалить категорию?</h3>
            <p className="text-neutral-500 mb-6">Это действие нельзя будет отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-2xl bg-neutral-100 font-bold">Отмена</button>
              <button onClick={() => handleDeleteCategory(deleteConfirmId)} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
