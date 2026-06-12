import { createContext, useContext } from 'react';
import type { AppState } from '../L2_Core/types';
import type { AppActions } from './providers';

interface AppStateContextValue {
  state: AppState | null;
  loading: boolean;
}

export interface UseAppValue {
  state: AppState | null;
  loading: boolean;
  actions: AppActions;
}

export const AppStateContext = createContext<AppStateContextValue | null>(null);
export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppProvider.');
  }
  return context;
}

export function useAppActions() {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error('useAppActions must be used inside AppProvider.');
  }
  return context;
}

export function useApp(): UseAppValue {
  const stateContext = useContext(AppStateContext);
  const actions = useContext(AppActionsContext);
  if (!stateContext || !actions) {
    throw new Error('useApp must be used inside AppProvider.');
  }
  return { state: stateContext.state, loading: stateContext.loading, actions };
}
