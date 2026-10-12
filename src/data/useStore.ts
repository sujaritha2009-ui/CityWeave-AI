import { useContext } from "react";
import { StoreContext } from "./storeContext";

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
