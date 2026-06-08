import { getDoc, setDoc, COLLECTIONS } from "@/services/FirebaseService";
import { AppConfig } from "@/constants/AppConfig";

const SETTINGS_DOC = "app_settings";

export interface AppSettings {
  whatsappGroupLink: string;
  minInvestmentAmount: number;
  updatedAt?: Date;
}

const DEFAULT_SETTINGS: AppSettings = {
  whatsappGroupLink: "",
  minInvestmentAmount: 50,
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await getDoc(COLLECTIONS.APP_META, SETTINGS_DOC);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...data } as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  const existing = await getSettings();
  const clean: Record<string, unknown> = { ...existing };
  if (settings.whatsappGroupLink !== undefined) clean.whatsappGroupLink = String(settings.whatsappGroupLink);
  if (settings.minInvestmentAmount !== undefined) clean.minInvestmentAmount = Number(settings.minInvestmentAmount) || 50;
  await setDoc(COLLECTIONS.APP_META, SETTINGS_DOC, clean);
};
