import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  increment 
} from 'firebase/firestore';
import { Account, AccountType, Category, TransactionType } from '../types';

export interface ImportResult {
  success: boolean;
  count: number;
  errors: string[];
}

export const importFinancialData = async (file: File): Promise<ImportResult> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // Try UTF-8 first
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with raw values
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length < 2) {
          resolve({ success: false, count: 0, errors: ['File is empty or missing data'] });
          return;
        }

        // Skip header
        const dataRows = rows.slice(1);
        let importedCount = 0;
        const errors: string[] = [];

        // Cache for accounts and categories to avoid redundant reads
        const accountCache: Record<string, string> = {};
        const categoryCache: Record<string, string> = {};

        const getOrCreateAccount = async (name: string) => {
          let id = accountCache[name];
          if (!id) {
            const accountsRef = collection(db, 'accounts');
            const q = query(accountsRef, where('userId', '==', userId), where('name', '==', name));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              // Determine account type based on name
              let type: AccountType = 'card';
              const lowerName = name.toLowerCase();
              
              if (lowerName.includes('cach') || lowerName.includes('нал') || lowerName.includes('лавэ') || lowerName.includes('копилк')) {
                type = 'cash';
              } else if (lowerName.includes('кк') || lowerName.includes('кред') || lowerName.includes('kk')) {
                type = 'credit';
              } else if (lowerName.includes('вклад') || lowerName.includes('счет')) {
                type = 'bank';
              }

              const newAccount = await addDoc(accountsRef, {
                userId,
                name: name,
                type,
                balance: 0,
                currency: 'RUB',
                showOnDashboard: true,
                showInTotals: true
              });
              id = newAccount.id;
            } else {
              id = snapshot.docs[0].id;
            }
            accountCache[name] = id;
          }
          return id;
        };

        const getOrCreateCategory = async (name: string, type: TransactionType) => {
          const key = `${name}_${type}`;
          let id = categoryCache[key];
          if (!id) {
            const categoriesRef = collection(db, 'categories');
            const q = query(categoriesRef, where('userId', '==', userId), where('name', '==', name), where('type', '==', type));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              const newCategory = await addDoc(categoriesRef, {
                userId,
                name: name,
                type,
                icon: type === 'income' ? 'TrendingUp' : 'ShoppingBag',
                color: type === 'income' ? '#10b981' : '#ef4444'
              });
              id = newCategory.id;
            } else {
              id = snapshot.docs[0].id;
            }
            categoryCache[key] = id;
          }
          return id;
        };

        for (const row of dataRows) {
          try {
            // Mapping based on prompt:
            // 0: Дата
            // 1: счет
            // 2: категория (или целевой счет при Снятии)
            // 3: Подкатегория
            // 4: заметки
            // 5: RUB (сумма)
            // 6: Доход/расход
            
            const dateStr = row[0];
            const accountName = row[1];
            const categoryOrTargetAccount = row[2];
            const subcategoryName = row[3] || '';
            const notes = row[4] || '';
            const amount = parseFloat(row[5]);
            const typeStr = row[6]?.toString().trim();

            if (!dateStr || !accountName || isNaN(amount)) continue;

            const isTransfer = typeStr === 'Снятие' || typeStr === 'Transfer';
            const description = [subcategoryName, notes].filter(Boolean).join(' - ');

            // Parse date
            let transactionDate = new Date();
            if (dateStr) {
              const parts = dateStr.toString().split(/[ /:]/);
              if (parts.length >= 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                const hour = parseInt(parts[3]) || 0;
                const min = parseInt(parts[4]) || 0;
                const sec = parseInt(parts[5]) || 0;
                transactionDate = new Date(year, month, day, hour, min, sec);
              }
            }

            if (isTransfer) {
              // Handle Transfer
              const sourceId = await getOrCreateAccount(accountName);
              const destId = await getOrCreateAccount(categoryOrTargetAccount);
              
              // Create a single transfer transaction
              await addDoc(collection(db, 'transactions'), {
                userId,
                accountId: sourceId,
                targetAccountId: destId,
                amount,
                type: 'transfer',
                description: description || `Перевод: ${accountName} -> ${categoryOrTargetAccount}`,
                createdAt: transactionDate.toISOString()
              });

              // Update both account balances
              await updateDoc(doc(db, 'accounts', sourceId), { balance: increment(-amount) });
              await updateDoc(doc(db, 'accounts', destId), { balance: increment(amount) });

            } else {
              // Handle Normal Transaction
              const type: TransactionType = (typeStr?.toLowerCase().includes('доход') || typeStr?.toLowerCase().includes('income')) 
                ? 'income' 
                : 'expense';

              const accountId = await getOrCreateAccount(accountName);
              const categoryId = await getOrCreateCategory(categoryOrTargetAccount, type);

              await addDoc(collection(db, 'transactions'), {
                userId,
                accountId,
                categoryId,
                amount,
                type,
                description: description || categoryOrTargetAccount,
                createdAt: transactionDate.toISOString()
              });

              await updateDoc(doc(db, 'accounts', accountId), {
                balance: increment(type === 'income' ? amount : -amount)
              });
            }

            importedCount++;
          } catch (err: any) {
            errors.push(`Row error: ${err.message}`);
          }
        }

        resolve({ success: true, count: importedCount, errors });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
