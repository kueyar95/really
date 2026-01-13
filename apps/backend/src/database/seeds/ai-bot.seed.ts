import { AiBot } from '../../modules/ai-bots/entities/ai-bot.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { AppDataSource } from './seed-config';

export const seedAiBots = async () => {
  const aiBotRepository = AppDataSource.getRepository(AiBot);
  const companyRepository = AppDataSource.getRepository(Company);

  // Obtener la primera compañía para asociar los bots
  const company = await companyRepository.findOne({
    where: { name: 'Empresa Demo 1' },
  });

  if (!company) {
    console.log('Error: No se encontró la compañía para asociar los bots');
    return;
  }

  const bots = [
    {
      name: 'Bot Ventas',
      companyId: company.id,
      ragConfig: {
      },
      functionsConfig: {
        allowedFunctions: ['sendMessage', 'createStage', 'updateStage']
      },
      sysPrompt: [
        {
          block_identifier: "personification",
          content: "Eres un asistente de ventas profesional y amable"
        },
        {
          block_identifier: "objective",
          content: "Tu objetivo es ayudar a los clientes a encontrar los productos adecuados y facilitar el proceso de compra"
        }
      ],
      mainConfig: {
        "model": "gpt-4o-mini",
        "maxTokens": 400,
        "temperature": 0.5
      }
    },
    {
      name: 'Bot Soporte',
      companyId: company.id,
      ragConfig: {
      },
      functionsConfig: {
        allowedFunctions: ['sendMessage', 'createTicket', 'escalateIssue']
      },
      sysPrompt: [
        {
          block_identifier: "personification",
          content: "Eres un asistente de soporte técnico profesional"
        },
        {
          block_identifier: "objective",
          content: "Tu objetivo es ayudar a los usuarios a resolver problemas técnicos y mejorar su experiencia"
        }
      ],
      mainConfig: {
        "model": "gpt-4o-mini",
        "maxTokens": 400,
        "temperature": 0.5
      }
    }
  ];

  for (const botData of bots) {
    const existingBot = await aiBotRepository.findOne({
      where: {
        name: botData.name,
        companyId: company.id
      },
    });

    if (!existingBot) {
      const bot = aiBotRepository.create(botData);
      await aiBotRepository.save(bot);
      console.log(`Bot creado: ${bot.name}`);
    }
  }
};