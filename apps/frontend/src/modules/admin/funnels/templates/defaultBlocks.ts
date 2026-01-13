import { PromptBlock } from "@/services/Bots/types";

export interface BlockConfig {
  description: string;
  block_name: string;
  order: number;
}

export const BLOCK_CONFIGS: Record<string, BlockConfig> = {
  personification: {
    description: "Crea el personaje de tu asistente IA. Lo que le dará un toque único con los clientes.",
    block_name: "Personificación",
    order: 0
  },
  objective: {
    description: "Define el objetivo de tu asistente IA ¿Qué es lo que quieres lograr con él?",
    block_name: "Objetivo",
    order: 1
  },
  communication_context: {
    description: "Define el contexto de tu asistente IA, puedes agregar información que creas relevante para que el asistente pueda responder mejor a tus clientes.",
    block_name: "Contexto de Comunicación",
    order: 2
  },
  steps_to_follow: {
    description: "Describe el flujo de conversación ideal para tu asistente, agregando pasos y funciones según sea necesario.",
    block_name: "Pasos a Seguir",
    order: 3
  },
  possible_cases: {
    description: "Agregue aquí casos específicos donde desea que su asistente de IA se comporte de una manera especial.",
    block_name: "Casos Posibles",
    order: 4
  },
  predefined_behavior: {
    description: "Implementa respuestas predefinidas o llamadas a funciones para que el asistente pueda enviar o ejecutar automáticamente cuando se detecten ciertos tipos de mensajes. Esto garantiza una comunicación consistente y estandarizada para escenarios comunes. Esto estará activo cuando empieces a recibir mensajes de los usuarios.",
    block_name: "Comportamiento Predefinido",
    order: 5
  },
  business_info: {
    description: "Use esta sección para proporcionar a su asistente información sobre su negocio, como ubicación, horarios de apertura, etc.",
    block_name: "Información del Negocio",
    order: 6
  },
  products_info: {
    description: "Use esta sección para proporcionar a su asistente información relevante sobre sus productos/servicios.",
    block_name: "Información de Productos",
    order: 7
  },
  important_info: {
    description: "Usa esta sección para darle alguna otra información relevante de tus productos/servicios/condiciones a tu asistente.",
    block_name: "Información Importante",
    order: 8
  },
  response_format: {
    description: "Define el formato de respuesta de tu asistente IA, puedes personalizarlo a tu gusto.",
    block_name: "Formato de Respuesta",
    order: 9
  },
  dont_do: {
    description: "Especifica lo que el asistente no debe hacer.",
    block_name: "No Hacer",
    order: 10
  }
};

export const DEFAULT_PROMPT_BLOCKS: PromptBlock[] = [
  {
    block_identifier: "personification",
    block_name: BLOCK_CONFIGS.personification.block_name,
    block_content: ""
  },
  {
    block_identifier: "objective",
    block_name: BLOCK_CONFIGS.objective.block_name,
    block_content: ""
  },
  {
    block_identifier: "communication_context",
    block_name: BLOCK_CONFIGS.communication_context.block_name,
    block_content: ""
  },
  {
    block_identifier: "steps_to_follow",
    block_name: BLOCK_CONFIGS.steps_to_follow.block_name,
    block_content: ""
  },
  {
    block_identifier: "possible_cases",
    block_name: BLOCK_CONFIGS.possible_cases.block_name,
    block_content: ""
  },
  {
    block_identifier: "predefined_behavior",
    block_name: BLOCK_CONFIGS.predefined_behavior.block_name,
    block_content: ""
  },
  {
    block_identifier: "business_info",
    block_name: BLOCK_CONFIGS.business_info.block_name,
    block_content: ""
  },
  {
    block_identifier: "products_info",
    block_name: BLOCK_CONFIGS.products_info.block_name,
    block_content: ""
  },
  {
    block_identifier: "important_info",
    block_name: BLOCK_CONFIGS.important_info.block_name,
    block_content: ""
  },
  {
    block_identifier: "response_format",
    block_name: BLOCK_CONFIGS.response_format.block_name,
    block_content: ""
  },
  {
    block_identifier: "dont_do",
    block_name: BLOCK_CONFIGS.dont_do.block_name,
    block_content: ""
  }
]; 