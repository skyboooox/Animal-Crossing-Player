import { createContext, useContext } from 'react';
import type { AppState } from '../L2_Core/types';
import type { AppActions } from './providers';

interface AppContextValue {
  state: AppState | null;
  loading: boolean;
  actions: AppActions;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider.');
  }
  return context;
}
