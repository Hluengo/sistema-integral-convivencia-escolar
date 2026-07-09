import React, { createContext, useContext } from 'react';
import type { Causa, UserRole } from '../types';

export interface AppContextValue {
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  currentRole: UserRole;
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  handleUpdateCausa: (updated: Causa) => void;
  handleDeleteCausa: (id: string) => void;
  handleSelectCausaFromDashboard: (causaId: string) => void;
  handleOpenCreateForm: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContextValue }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
  return ctx;
}