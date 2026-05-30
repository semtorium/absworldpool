"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Lang, type Translations, getT, LANGUAGES } from "./i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: getT("en"),
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("abs_lang") as Lang | null;
    if (saved && LANGUAGES.find(l => l.code === saved)) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("abs_lang", l);
    // RTL support
    document.documentElement.dir = LANGUAGES.find(x => x.code === l)?.dir ?? "ltr";
  };

  const dir = LANGUAGES.find(x => x.code === lang)?.dir ?? "ltr";

  return (
    <Ctx.Provider value={{ lang, setLang, t: getT(lang), dir }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
