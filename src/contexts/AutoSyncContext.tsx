import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AutoSyncContextType {
  isSyncing: boolean;
  isCompleted: boolean;
  currentType: string;
  storeName: string;
  itemsSynced: number;
  startSync: (storeName: string) => void;
  updateProgress: (type: string, items: number) => void;
  completeSync: (itemsSynced: number) => void;
  endSync: () => void;
}

const AutoSyncContext = createContext<AutoSyncContextType | undefined>(undefined);

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentType, setCurrentType] = useState('products');
  const [storeName, setStoreName] = useState('');
  const [itemsSynced, setItemsSynced] = useState(0);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startSync = (name: string) => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    setStoreName(name);
    setIsSyncing(true);
    setIsCompleted(false);
    setCurrentType('products');
    setItemsSynced(0);
  };

  const updateProgress = (type: string, items: number) => {
    setCurrentType(type);
    setItemsSynced(items);
  };

  const completeSync = (items: number) => {
    setIsCompleted(true);
    setItemsSynced(items);
    setCurrentType('completed');
  };

  const endSync = () => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    setIsSyncing(false);
    setIsCompleted(false);
    setCurrentType('products');
    setStoreName('');
    setItemsSynced(0);
  };

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AutoSyncContext.Provider value={{ 
      isSyncing, 
      isCompleted,
      currentType, 
      storeName, 
      itemsSynced,
      startSync, 
      updateProgress,
      completeSync,
      endSync 
    }}>
      {children}
    </AutoSyncContext.Provider>
  );
}

export function useAutoSyncProgress() {
  const context = useContext(AutoSyncContext);
  if (!context) {
    throw new Error('useAutoSyncProgress must be used within AutoSyncProvider');
  }
  return context;
}
