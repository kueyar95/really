import { barberTemplateBlocks } from "./templateBlocks/barberTemplate";
import { ecommerceTemplateBlocks } from "./templateBlocks/ecommerceTemplate";
import { basicTemplateBlocks } from "./templateBlocks/basicTemplate";
import { medilinkTemplateBlocks } from "./templateBlocks/medilinkTemplate";
import { Template } from "./types";
import { BLOCK_CONFIGS } from "./defaultBlocks";
import { PromptBlock } from "@/services/Bots/types";
import { Step } from "@/services/Bots/types";

interface StageConfig {
  blocks: PromptBlock[];
  steps: Step[];
}

const getBlocksForStage = (templateBlocks: typeof barberTemplateBlocks, stageName: string): StageConfig => {
  const stageConfig = templateBlocks.stages.find(s => s.stage === stageName);
  if (!stageConfig) {
    return {
      blocks: [],
      steps: []
    };
  }

  // Crear una copia profunda de los bloques para cada stage
  const blocks = stageConfig.blocks.map(block => ({
    block_identifier: block.block_identifier,
    block_name: BLOCK_CONFIGS[block.block_identifier]?.block_name || block.block_identifier,
    block_content: block.block_content
  }));

  // Obtener los steps si existen
  const steps = stageConfig.steps || [];

  return {
    blocks,
    steps
  };
};

export const templates: Template[] = [
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Plantilla ideal para tiendas online",
    icon: "🛒",
    stages: [
      {
        name: "general",
        description: "Etapa que ingresa al funnel",
        isHuman: false,
        bot: {
          name: "Bot para general",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(ecommerceTemplateBlocks, "general").blocks,
          steps: getBlocksForStage(ecommerceTemplateBlocks, "general").steps,
        },
      },
      {
        name: "cotizador",
        description: "Etapa interesada en cotizar productos",
        isHuman: false,
        bot: {
          name: "Bot para cotizador",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(ecommerceTemplateBlocks, "cotizador").blocks,
          steps: getBlocksForStage(ecommerceTemplateBlocks, "cotizador").steps,
        },
      },
      {
        name: "Asistencia Humana",
        description: "Etapa que requiere atención personalizada",
        isHuman: true,
        bot: null,
      },
    ],
    functions: ecommerceTemplateBlocks.functions || [],
  },
  {
    id: "barberia",
    name: "Barbería",
    description: "Plantilla para barberías y salones",
    icon: "💈",
    stages: [
      {
        name: "general",
        description: "Etapa que ingresa al funnel",
        isHuman: false,
        bot: {
          name: "Bot para Inicial",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(barberTemplateBlocks, "general").blocks,
          steps: getBlocksForStage(barberTemplateBlocks, "general").steps,
        },
      },
      {
        name: "agendador",
        description: "Etapa interesada en agendar una cita",
        isHuman: false,
        bot: {
          name: "Bot para Agendador",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(barberTemplateBlocks, "agendador").blocks,
          steps: getBlocksForStage(barberTemplateBlocks, "agendador").steps,
        },
      },
      {
        name: "agendados",
        description: "Etapa con cita confirmada",
        isHuman: false,
        bot: {
          name: "Bot para Agendados",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(barberTemplateBlocks, "agendados").blocks,
          steps: getBlocksForStage(barberTemplateBlocks, "agendados").steps,
        },
      },
      {
        name: "Asistencia Humana",
        description: "Etapa que requiere atención personalizada",
        isHuman: true,
        bot: null,
      },
    ],
    functions: barberTemplateBlocks.functions || [],
  },
  {
    id: "basic",
    name: "Básico",
    description: "Plantilla simple para preguntas generales",
    icon: "❓",
    stages: [
      {
        name: "general",
        description: "Etapa para responder preguntas generales",
        isHuman: false,
        bot: {
          name: "Bot para preguntas generales",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(basicTemplateBlocks, "general").blocks,
          steps: getBlocksForStage(basicTemplateBlocks, "general").steps,
        },
      },
      {
        name: "Asistencia Humana",
        description: "Etapa que requiere atención personalizada",
        isHuman: true,
        bot: null,
      },
    ],
    functions: basicTemplateBlocks.functions || [],
  },
  {
    id: "medilink",
    name: "Medilink - Agendamiento Médico",
    description: "Plantilla para clínicas y centros médicos",
    icon: "🏥",
    stages: [
      {
        name: "intake",
        description: "Identificación del paciente",
        isHuman: false,
        bot: {
          name: "Bot para identificación",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(medilinkTemplateBlocks, "intake").blocks,
          steps: getBlocksForStage(medilinkTemplateBlocks, "intake").steps,
        },
      },
      {
        name: "needs",
        description: "Preferencias de sucursal y especialidad",
        isHuman: false,
        bot: {
          name: "Bot para preferencias",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(medilinkTemplateBlocks, "needs").blocks,
          steps: getBlocksForStage(medilinkTemplateBlocks, "needs").steps,
        },
      },
      {
        name: "select_professional",
        description: "Selección de profesional médico",
        isHuman: false,
        bot: {
          name: "Bot para selección de profesional",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(medilinkTemplateBlocks, "select_professional").blocks,
          steps: getBlocksForStage(medilinkTemplateBlocks, "select_professional").steps,
        },
      },
      {
        name: "select_slot",
        description: "Selección de horario",
        isHuman: false,
        bot: {
          name: "Bot para selección de horario",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(medilinkTemplateBlocks, "select_slot").blocks,
          steps: getBlocksForStage(medilinkTemplateBlocks, "select_slot").steps,
        },
      },
      {
        name: "confirm",
        description: "Confirmación de cita",
        isHuman: false,
        bot: {
          name: "Bot para confirmación",
          model: "gpt-4o-mini",
          maxTokens: 500,
          temperature: 0.7,
          sysPrompt: getBlocksForStage(medilinkTemplateBlocks, "confirm").blocks,
          steps: getBlocksForStage(medilinkTemplateBlocks, "confirm").steps,
        },
      },
      {
        name: "Asistencia Humana",
        description: "Etapa que requiere atención personalizada",
        isHuman: true,
        bot: null,
      },
    ],
    functions: medilinkTemplateBlocks.functions || [],
  },
  {
    id: "blank",
    name: "Empezar desde cero",
    description: "Crea tu propio funnel personalizado",
    icon: "🔧",
    stages: [],
    functions: [],
  },
]; 