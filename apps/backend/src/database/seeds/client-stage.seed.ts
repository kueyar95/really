import { ClientStage } from '../../modules/clients/entities/client-stage.entity';
import { Client } from '../../modules/clients/entities/client.entity';
import { Stage } from '../../modules/stages/entities/stage.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/users/enums/role.enum';
import { AppDataSource } from './seed-config';
import { Funnel } from '@/modules/funnels/entities/funnel.entity';

export const seedClientStages = async () => {
  const clientStageRepository = AppDataSource.getRepository(ClientStage);
  const clientRepository = AppDataSource.getRepository(Client);
  const stageRepository = AppDataSource.getRepository(Stage);
  const userRepository = AppDataSource.getRepository(User);
  const funnelRepository = AppDataSource.getRepository(Funnel);

  // Obtener todos los clientes
  const clients = await clientRepository.find();
  if (clients.length === 0) {
    return;
  }

  // Obtener todos los stages
  const stages = await stageRepository.find();
  if (stages.length === 0) {
    return;
  }

  // Obtener todos los funnels
  const funnels = await funnelRepository.find();
  if (funnels.length === 0) {
    return;
  }

  // Obtener vendedores
  const vendedores = await userRepository.find({
    where: { role: Role.VENDEDOR }
  });
  if (vendedores.length === 0) {
    return;
  }

  // Crear algunas asignaciones de ejemplo
  const clientStagesData = [
    {
      clientId: clients[0].id, // Juan Pérez
      stageId: stages[0].id, // Stage de Bienvenida
      funnelId: funnels[0].id,
      assignedUserId: vendedores[0].id
    },
    {
      clientId: clients[0].id, // Juan Pérez
      stageId: stages[1].id, // Stage de Catálogo
      funnelId: funnels[1].id,
      assignedUserId: vendedores[0].id
    },
    {
      clientId: clients[1].id, // María González
      stageId: stages[0].id, // Stage de Bienvenida
      funnelId: funnels[1].id,
      assignedUserId: vendedores[0].id
    },
    {
      clientId: clients[2].id, // Carlos Rodríguez
      stageId: stages[4].id, // Stage de Identificación Problema (Soporte)
      funnelId: funnels[2].id,
      assignedUserId: vendedores[0].id
    }
  ];

  for (const clientStageData of clientStagesData) {
    const existingClientStage = await clientStageRepository.findOne({
      where: {
        clientId: clientStageData.clientId,
        stageId: clientStageData.stageId
      },
    });

    if (!existingClientStage) {
      const clientStage = clientStageRepository.create(clientStageData);
      await clientStageRepository.save(clientStage);
    }
  }
};