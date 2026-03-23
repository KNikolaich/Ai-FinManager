import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Goal } from '../types';
import { X, Plus, Trash2, Check, Calendar } from 'lucide-react';

interface GoalManagerProps {
  goals: Goal[];
  userId: string;
  onClose: () => void;
}

export default function GoalManager({ goals, userId, onClose }: GoalManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetAmount('');
    setDeadline('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'goals'), {
        userId,
        name,
        description,
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        deadline,
        isCompleted: false
      });
      resetForm();
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, completed: boolean) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'goals', id), {
        isCompleted: completed,
        completedAt: completed ? new Date().toISOString() : null
      });
    } catch (error) {
      console.error('Error updating goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту цель?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">Управление целями</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-neutral-500 text-sm">Всего целей: {goals.length}</p>
            {!isAdding && (
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
            <div className="bg-emerald-50/50 p-4 rounded-2xl mb-6 space-y-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Заголовок" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Описание" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="Сумма" />
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={handleAdd} disabled={loading} className="p-2 bg-emerald-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={resetForm} className="p-2 bg-neutral-200 text-neutral-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className={`p-4 rounded-2xl border ${goal.isCompleted ? 'bg-neutral-50 border-neutral-100' : 'bg-white border-neutral-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold ${goal.isCompleted ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{goal.name}</h3>
                    <p className="text-xs text-neutral-400">{goal.description}</p>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {goal.deadline}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(goal.id, !goal.isCompleted)} className={`p-2 rounded-lg ${goal.isCompleted ? 'bg-neutral-200' : 'bg-emerald-100 text-emerald-600'}`}><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(goal.id)} className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
