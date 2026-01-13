import { Stage, StageStatus } from '../../modules/stages/entities/stage.entity';
import { Funnel } from '../../modules/funnels/entities/funnel.entity';
import { AiBot } from '../../modules/ai-bots/entities/ai-bot.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { AppDataSource } from './seed-config';

export const seedStages = async () => {
  const stageRepository = AppDataSource.getRepository(Stage);
  const funnelRepository = AppDataSource.getRepository(Funnel);
  const aiBotRepository = AppDataSource.getRepository(AiBot);
  const companyRepository = AppDataSource.getRepository(Company);

  // Obtener la compañía
  const company = await companyRepository.findOne({
    where: { name: 'Empresa Demo 1' },
  });

  if (!company) {
    return;
  }

  // Obtener los funnels
  const funnels = await funnelRepository.find({
    where: { companyId: company.id },
  });

  if (funnels.length === 0) {
    return;
  }

  // Obtener los bots
  const bots = await aiBotRepository.find({
    where: { companyId: company.id },
  });

  if (bots.length === 0) {
    return;
  }

  // Crear stages para el funnel de ventas
  const ventasFunnel = funnels.find(f => f.name === 'Funnel Ventas Productos');
  const ventasBot = bots.find(b => b.name === 'Bot Ventas');

  if (ventasFunnel && ventasBot) {
    const ventasStages = [
      {
        funnelId: ventasFunnel.id,
        botId: ventasBot.id,
        name: 'Bienvenida',
        description: 'Mensaje de bienvenida y presentación de productos',
        order: 1,
        status: StageStatus.ACTIVE
      },
      {
        funnelId: ventasFunnel.id,
        botId: ventasBot.id,
        name: 'Catálogo',
        description: 'Mostrar catálogo de productos',
        order: 2,
        status: StageStatus.ACTIVE
      },
      {
        funnelId: ventasFunnel.id,
        botId: ventasBot.id,
        name: 'Cotización',
        description: 'Generar cotización personalizada',
        order: 3,
        status: StageStatus.ACTIVE
      }
    ];

    for (const stageData of ventasStages) {
      const existingStage = await stageRepository.findOne({
        where: {
          name: stageData.name,
          funnelId: ventasFunnel.id
        },
      });

      if (!existingStage) {
        const stage = stageRepository.create(stageData);
        await stageRepository.save(stage);
      }
    }
  }

  // Crear stages para el funnel de soporte
  const soporteFunnel = funnels.find(f => f.name === 'Funnel Soporte Técnico');
  const soporteBot = bots.find(b => b.name === 'Bot Soporte');

  if (soporteFunnel && soporteBot) {
    const soporteStages = [
      {
        funnelId: soporteFunnel.id,
        botId: soporteBot.id,
        name: 'Identificación Problema',
        description: 'Identificar el tipo de problema técnico',
        order: 1,
        status: StageStatus.ACTIVE
      },
      {
        funnelId: soporteFunnel.id,
        botId: soporteBot.id,
        name: 'Diagnóstico',
        description: 'Realizar diagnóstico inicial',
        order: 2,
        status: StageStatus.ACTIVE
      },
      {
        funnelId: soporteFunnel.id,
        botId: soporteBot.id,
        name: 'Solución',
        description: 'Proponer soluciones o escalar a agente',
        order: 3,
        status: StageStatus.ACTIVE
      }
    ];

    for (const stageData of soporteStages) {
      const existingStage = await stageRepository.findOne({
        where: {
          name: stageData.name,
          funnelId: soporteFunnel.id
        },
      });

      if (!existingStage) {
        const stage = stageRepository.create(stageData);
        await stageRepository.save(stage);
      }
    }
  }
};