export type BotFunction = {
  id: string;
  name: string;
  description?: string;
  activationDescription?: string;
  category: "stage" | "scheduling" | "quotes" | "custom" | "google_sheet";
  parameters?: Record<string, unknown>;
  constData?: Record<string, unknown>;
};