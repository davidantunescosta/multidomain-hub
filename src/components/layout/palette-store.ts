import { create } from "zustand";

interface S { open: boolean; setOpen: (v: boolean) => void; toggle: () => void; }
export const useCommandPalette = create<S>(set => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set(s => ({ open: !s.open })),
}));
