import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { LogOut, User as UserIcon, Database, Shield, Github, Info, Sparkles, CheckCircle2, Eraser, Trash2, AlertTriangle, Tag, FileDown } from 'lucide-react';
import { useState } from 'react';
import { generateDemoData } from '../services/demoDataService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import CategoryManager from './CategoryManager';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsProps {
  user: User;
  onLogout: () => void;
  onShowLogs: () => void;
}

export default function Settings({ user, onLogout, onShowLogs }: SettingsProps) {
  const [seeding, setSeeding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [exporting, setExporting] = useState(false);

  const seedInitialData = async () => {
    setSeeding(true);
    setSuccess(false);
    try {
      await generateDemoData(user.uid);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  const clearAllData = async () => {
    setClearing(true);
    try {
      const batch = writeBatch(db);
      
      // Clear Transactions
      const transactionsSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)));
      transactionsSnap.docs.forEach(d => batch.delete(d.ref));
      
      // Clear Accounts
      const accountsSnap = await getDocs(query(collection(db, 'accounts'), where('userId', '==', user.uid)));
      accountsSnap.docs.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Clear error:', error);
    } finally {
      setClearing(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();

      const collections = ['transactions', 'accounts', 'categories', 'goals', 'budgets'];
      
      for (const colName of collections) {
        const snap = await getDocs(query(collection(db, colName), where('userId', '==', user.uid)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, colName);
      }

      const date = new Date().toISOString().split('T')[0];
      const fileName = `backupAiFinAssistant_${date}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-1.5 sm:p-2 lg:p-6 space-y-8">
      <h2 className="text-2xl font-bold">Настройки</h2>

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-8 h-8 text-emerald-600" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-lg">{user.displayName || 'Пользователь'}</h3>
          <p className="text-sm text-neutral-400">{user.email}</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4 relative">
        {showCategoryManager && <CategoryManager user={user} onClose={() => setShowCategoryManager(false)} />}
        
        {/* Clear Data Confirmation Overlay */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200 border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Очистить все данные?</h3>
            <p className="text-neutral-500 mb-8 text-sm">Все ваши счета и операции будут удалены навсегда. Категории останутся нетронутыми.</p>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={clearAllData}
                disabled={clearing}
                className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {clearing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Да, очистить всё
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="w-full bg-neutral-100 text-neutral-600 font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-all active:scale-95"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <section className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-sm">
          <div className="flex items-center border-b border-neutral-50">
            <button 
              onClick={seedInitialData}
              disabled={seeding || success}
              className="flex-1 px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                success ? "bg-emerald-100" : "bg-amber-100"
              )}>
                {success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Sparkles className="w-5 h-5 text-amber-600" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{seeding ? 'Создание...' : success ? 'Готово!' : 'Создать демо-данные'}</p>
                <p className="text-xs text-neutral-400">
                  {success ? 'Проверьте вкладку "Обзор"' : 'Добавить 3 карты и операции за 3 месяца'}
                </p>
              </div>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-6 py-4 hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-all border-l border-neutral-50 group"
              title="Очистить все данные"
            >
              <Eraser className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <button 
            onClick={exportData}
            disabled={exporting}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              {exporting ? (
                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <FileDown className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Экспорт данных</p>
              <p className="text-xs text-neutral-400">Скачать все данные в Excel</p>
            </div>
          </button>

          <button 
            onClick={() => setShowCategoryManager(true)}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Категории</p>
              <p className="text-xs text-neutral-400">Управление категориями операций</p>
            </div>
          </button>

          <button 
            onClick={onShowLogs}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
          >
            <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Логи AI</p>
              <p className="text-xs text-neutral-400">История запросов и ответов ассистента</p>
            </div>
          </button>

          <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Безопасность</p>
              <p className="text-xs text-neutral-400">Управление доступом и сессиями</p>
            </div>
          </button>
        </section>

        <section className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-sm">
          <a href="https://github.com/KNikolaich/AiFinAssistant" target="_blank" className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
              <Github className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">GitHub</p>
              <p className="text-xs text-neutral-400">Исходный код проекта</p>
            </div>
          </a>
          
          <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">О приложении</p>
              <p className="text-xs text-neutral-400">Версия 1.0.0 (MVP)</p>
            </div>
          </button>
        </section>

        <button 
          onClick={onLogout}
          className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-all active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
