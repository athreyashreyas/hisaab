/**
 * Transient UI state: the global Add sheet (opened from the FAB on every screen)
 * and the update overlay flag. Release notes live on their own route now (the
 * guide's What's new pane), so there is no changelog modal to track. Persisted
 * UI prefs are none for now, this is all session state.
 */
import { create } from 'zustand';
import type { Transaction } from '../types';

interface UIState {
  addSheetOpen: boolean;
  /** When set, the Add sheet opens in edit mode for this transaction. */
  editingTxn: Transaction | null;
  updating: boolean;

  openAdd: () => void;
  openEdit: (txn: Transaction) => void;
  closeAdd: () => void;
  setUpdating: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  addSheetOpen: false,
  editingTxn: null,
  updating: false,

  openAdd: () => set({ addSheetOpen: true, editingTxn: null }),
  openEdit: (txn) => set({ addSheetOpen: true, editingTxn: txn }),
  closeAdd: () => set({ addSheetOpen: false, editingTxn: null }),
  setUpdating: (v) => set({ updating: v }),
}));
