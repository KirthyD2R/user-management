import { createContext, useContext, ReactNode } from 'react';

interface AppConfig {
  excludeRoleSlugs: string[];
}

const AppConfigContext = createContext<AppConfig>({ excludeRoleSlugs: [] });

export function AppConfigProvider({
  children,
  excludeRoleSlugs = [],
}: {
  children: ReactNode;
  excludeRoleSlugs?: string[];
}) {
  return (
    <AppConfigContext.Provider value={{ excludeRoleSlugs }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
