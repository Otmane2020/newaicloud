import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AutoSyncContextType {
  isSyncing: boolean;
  isCompleted: boolean;
  currentType: string;
  storeName: string;
  itemsSynced: number;
  startSync: (storeName: string) => void;
  updateType: (type: string) => void;
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
    // Clear any pending auto-close
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

  const updateType = (type: string) => {
    setCurrentType(type);
  };

  const completeSync = (items: number) => {
    setIsCompleted(true);
    setItemsSynced(items);
    setCurrentType('completed');
    
    // Auto-close after 3 seconds
    autoCloseTimeoutRef.current = setTimeout(() => {
      setIsSyncing(false);
      setIsCompleted(false);
      setCurrentType('products');
      setStoreName('');
      setItemsSynced(0);
    }, 3000);
  };

  const endSync = () => {
    // Clear any pending auto-close
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

  // Cleanup on unmount
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
      updateType, 
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
