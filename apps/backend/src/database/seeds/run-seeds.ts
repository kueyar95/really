import { AppDataSource } from './seed-config';
import { seedCompanies } from './company.seed';
import { seedUsers } from './user.seed';
import { seedAiBots } from './ai-bot.seed';
import { seedChannels } from './channel.seed';
import { seedFunnels } from './funnel.seed';
import { seedStages } from './stage.seed';
import { seedClients } from './client.seed';
import { seedClientStages } from './client-stage.seed';
import { seedChatHistory } from './chat-history.seed';

const runSeeds = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Base de datos conectada');

    // Ejecutar seeds en orden
    await seedCompanies();
    await seedUsers();
    await seedAiBots();
    await seedChannels();
    await seedFunnels();
    await seedStages();
    await seedClients();
    await seedClientStages();
    await seedChatHistory();

    console.log('Seeds ejecutados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar los seeds:', error);
    process.exit(1);
  }
};

runSeeds();