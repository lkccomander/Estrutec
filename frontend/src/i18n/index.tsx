import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './en.json'
import es from './es.json'

type Language = 'es' | 'en'

const messages = { es, en } as const

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: string) => string
}

const STORAGE_KEY = 'elatilo_language'

const I18nContext = createContext<I18nContextValue | null>(null)

function getNestedValue(source: unknown, path: string): string | null {
  const result = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return null
    }

    return (current as Record<string, unknown>)[key]
  }, source)

  return typeof result === 'string' ? result : null
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' ? 'en' : 'es'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'es' ? 'en' : 'es')),
      t: (key: string) => getNestedValue(messages[language], key) ?? key,
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}

export type { Language }
