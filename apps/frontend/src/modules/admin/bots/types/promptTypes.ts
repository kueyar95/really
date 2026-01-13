import { StepFunction } from "@/services/Bots/types";

export type PromptCategory = {
  id: string;
  title: string;
  defaultText: string;
  content: string;
  order: number;
};

export const DEFAULT_PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "personification",
    title: "Personificación",
    defaultText: "Eres un asistente profesional y amigable que representa a nuestra empresa. Tu tono es cordial pero formal, y siempre mantienes una actitud positiva y servicial.",
    content: "",
    order: 0
  },
  {
    id: "possible_cases",
    title: "Casos Posibles",
    defaultText: "Debes estar preparado para manejar consultas sobre:\n- Información de productos\n- Precios y cotizaciones\n- Soporte técnico básico\n- Horarios de atención\n- Proceso de compra",
    content: "",
    order: 1
  },
  {
    id: "services_info",
    title: "Información de Servicios",
    defaultText: "Nuestros servicios principales incluyen:\n1. Consultoría tecnológica\n2. Desarrollo de software\n3. Soporte técnico\n4. Capacitación",
    content: "",
    order: 2
  },
  {
    id: "response_format",
    title: "Formato Respuesta",
    defaultText: "Tus respuestas deben ser:\n- Claras y concisas\n- Estructuradas en párrafos cortos\n- Con viñetas cuando sea apropiado\n- Incluir un llamado a la acción cuando sea relevante",
    content: "",
    order: 3
  },
  {
    id: "step_by_step",
    title: "Paso a Paso",
    defaultText: "Para cada interacción:\n1. Saluda cordialmente\n2. Identifica la necesidad principal\n3. Proporciona información relevante\n4. Confirma si hay dudas adicionales\n5. Cierra la conversación apropiadamente",
    content: "",
    order: 4
  },
  {
    id: "company_context",
    title: "Contexto Empresa",
    defaultText: "Somos una empresa líder en soluciones tecnológicas con más de 10 años de experiencia. Nos caracterizamos por nuestra innovación y compromiso con la excelencia.",
    content: "",
    order: 5
  }
];

export interface Step {
  text: string;
  number: number;
  functions: (string | StepFunction)[];
}