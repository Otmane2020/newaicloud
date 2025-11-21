import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AutoSyncContextType {
  isSyncing: boolean;
  currentType: string;
  storeName: string;
  startSync: (storeName: string) => void;
  updateType: (type: string) => void;
  endSync: () => void;
}

const AutoSyncContext = createContext<AutoSyncContextType | undefined>(undefined);

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentType, setCurrentType] = useState('products');
  const [storeName, setStoreName] = useState('');

  const startSync = (name: string) => {
    setStoreName(name);
    setIsSyncing(true);
    setCurrentType('products');
  };

  const updateType = (type: string) => {
    setCurrentType(type);
  };

  const endSync = () => {
    setIsSyncing(false);
    setCurrentType('products');
    setStoreName('');
  };

  return (
    <AutoSyncContext.Provider value={{ isSyncing, currentType, storeName, startSync, updateType, endSync }}>
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
