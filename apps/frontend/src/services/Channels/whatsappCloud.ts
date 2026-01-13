import api from "../api";

function getApiBase(): string {
  const candidates = [
    api?.defaults?.baseURL,
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_BACKEND_URL,
  ].filter((x): x is string => !!x && typeof x === "string" && x.length > 0);

  if (candidates.length === 0) {
    throw new Error("API base URL no definida (VITE_API_URL o axios.baseURL).");
  }
  // sin trailing slash
  return candidates[0].replace(/\/$/, "");
}

export const WhatsAppCloudService = {
  /** URL que dispara el flujo embebido (el backend hace 302 → Facebook). */
  getEmbeddedStartUrl(companyId: string) {
    const base = getApiBase(); // p.ej. https://<ngrok>/api
    const url = new URL("/integrations/whatsapp/embedded-signup/start", base);
    //url.searchParams.set("companyId", companyId);
    return url.toString();
  },

  /** (Opcional) Probar envío tras conectar */
  async sendTestMessage(phoneNumberId: string, accessToken: string, toE164: string, text: string) {
    return api.post("/integrations/whatsapp/send", { phoneNumberId, accessToken, to: toE164, type: "text", text });
  },
};
