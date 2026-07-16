/**
 * Transient UI state: the global Add sheet (opened from the FAB on every screen),
 * the changelog modal (opened from the sync dot and Settings), and the update
 * overlay flag. Persisted UI prefs are none for now — this is all session state.
 */
import { create } from 'zustand';
import type { Transaction } from '../types';

interface UIState {
  addSheetOpen: boolean;
  /** When set, the Add sheet opens in edit mode for this transaction. */
  editingTxn: Transaction | null;
  changelogOpen: boolean;
  updating: boolean;

  openAdd: () => void;
  openEdit: (txn: Transaction) => void;
  closeAdd: () => void;
  openChangelog: () => void;
  closeChangelog: () => void;
  setUpdating: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  addSheetOpen: false,
  editingTxn: null,
  changelogOpen: false,
  updating: false,

  openAdd: () => set({ addSheetOpen: true, editingTxn: null }),
  openEdit: (txn) => set({ addSheetOpen: true, editingTxn: txn }),
  closeAdd: () => set({ addSheetOpen: false, editingTxn: null }),
  openChangelog: () => set({ changelogOpen: true }),
  closeChangelog: () => set({ changelogOpen: false }),
  setUpdating: (v) => set({ updating: v }),
}));
