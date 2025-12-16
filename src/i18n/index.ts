import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Italiano
import commonIT from './locales/it/common.json';
import authIT from './locales/it/auth.json';
import sidebarIT from './locales/it/sidebar.json';
import dashboardIT from './locales/it/dashboard.json';
import invitatiIT from './locales/it/invitati.json';
import famiglieIT from './locales/it/famiglie.json';
import gruppiIT from './locales/it/gruppi.json';
import tavoliIT from './locales/it/tavoli.json';
import matrimoniIT from './locales/it/matrimoni.json';
import utentiIT from './locales/it/utenti.json';
import settingsIT from './locales/it/settings.json';

// English
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import sidebarEN from './locales/en/sidebar.json';
import dashboardEN from './locales/en/dashboard.json';
import invitatiEN from './locales/en/invitati.json';
import famiglieEN from './locales/en/famiglie.json';
import gruppiEN from './locales/en/gruppi.json';
import tavoliEN from './locales/en/tavoli.json';
import matrimoniEN from './locales/en/matrimoni.json';
import utentiEN from './locales/en/utenti.json';
import settingsEN from './locales/en/settings.json';

const resources = {
  it: {
    common: commonIT,
    auth: authIT,
    sidebar: sidebarIT,
    dashboard: dashboardIT,
    invitati: invitatiIT,
    famiglie: famiglieIT,
    gruppi: gruppiIT,
    tavoli: tavoliIT,
    matrimoni: matrimoniIT,
    utenti: utentiIT,
    settings: settingsIT,
  },
  en: {
    common: commonEN,
    auth: authEN,
    sidebar: sidebarEN,
    dashboard: dashboardEN,
    invitati: invitatiEN,
    famiglie: famiglieEN,
    gruppi: gruppiEN,
    tavoli: tavoliEN,
    matrimoni: matrimoniEN,
    utenti: utentiEN,
    settings: settingsEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'it',
    defaultNS: 'common',
    ns: ['common', 'auth', 'sidebar', 'dashboard', 'invitati', 'famiglie', 'gruppi', 'tavoli', 'matrimoni', 'utenti', 'settings'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
