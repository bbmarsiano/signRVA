// constants — template categories, section labels, create-route slug mapping
import type { TemplateCategory } from "@/types";

export const SECTION_LABELS: Record<string, string> = {
  naemodik: "Данни на наемодателя",
  naematel: "Данни на наематела",
  imot: "Данни за имота",
  usloviya: "Условия на договора",
  prodavach: "Данни на продавача",
  kupuvach: "Данни на купувача",
  mps: "Данни за МПС",
  izpalnitel: "Данни на изпълнителя",
  vozlagatel: "Данни на възложителя",
  usluga: "Описание на услугата",
  upalnomoshchitel: "Упълномощител",
  palnomoshnik: "Пълномощник",
  palnomoshchia: "Пълномощия",
  klub: "Данни за клуба",
  chlen: "Данни на члена",
  uslovi: "Условия",
  declaracii: "Декларации",
  saglasie: "Съгласие",
  general: "Основна информация",
};

/** Maps DB category to legacy create API template_id slug (placeholder PDF). */
export function categoryToCreateSlug(category: TemplateCategory): string {
  const map: Record<TemplateCategory, string> = {
    rental: "rent",
    vehicle: "vehicle",
    services: "services",
    power_of_attorney: "power-of-attorney",
    membership: "membership",
    other: "services",
  };
  return map[category] ?? "services";
}

export function sectionLabel(section: string | undefined): string {
  if (!section) return SECTION_LABELS.general;
  return SECTION_LABELS[section] ?? section;
}
