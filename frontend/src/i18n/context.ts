import { createContext } from 'react'

export type Language = 'es' | 'en'

export type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: string) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
