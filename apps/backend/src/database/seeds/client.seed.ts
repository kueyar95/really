import { Client } from '../../modules/clients/entities/client.entity';
import { AppDataSource } from './seed-config';

export const seedClients = async () => {
  const clientRepository = AppDataSource.getRepository(Client);

  const clients = [
    {
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      phone: '+56912345678',
      data: {
        age: 35,
        occupation: 'Ingeniero',
        interests: ['Tecnología', 'Deportes']
      }
    },
    {
      name: 'María González',
      email: 'maria.gonzalez@example.com',
      phone: '+56987654321',
      data: {
        age: 28,
        occupation: 'Diseñadora',
        interests: ['Arte', 'Moda']
      }
    },
    {
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@example.com',
      phone: '+56923456789',
      data: {
        age: 42,
        occupation: 'Empresario',
        interests: ['Negocios', 'Inversiones']
      }
    },
    {
      name: 'Ana Silva',
      email: 'ana.silva@example.com',
      phone: '+56934567890',
      data: {
        age: 31,
        occupation: 'Médico',
        interests: ['Salud', 'Bienestar']
      }
    }
  ];

  for (const clientData of clients) {
    const existingClient = await clientRepository.findOne({
      where: { email: clientData.email },
    });

    if (!existingClient) {
      const client = clientRepository.create(clientData);
      await clientRepository.save(client);
    }
  }
};