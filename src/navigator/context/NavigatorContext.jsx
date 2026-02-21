import React from "react";
import { createContext } from "react";

export const NavigatorContext = createContext(null);

export function NavigatorProvider({ children }) {
  return (
    <NavigatorContext.Provider value={{}}>{children}</NavigatorContext.Provider>
  );
}
