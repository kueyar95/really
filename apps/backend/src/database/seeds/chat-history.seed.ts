import { ChatHistory } from '../../modules/clients/entities/chat-history.entity';
import { Client } from '../../modules/clients/entities/client.entity';
import { Channel } from '../../modules/channels/persistence/entities/channel.entity';
import { AppDataSource } from './seed-config';

export const seedChatHistory = async () => {
  const chatHistoryRepository = AppDataSource.getRepository(ChatHistory);
  const clientRepository = AppDataSource.getRepository(Client);
  const channelRepository = AppDataSource.getRepository(Channel);

  // Obtener clientes
  const clients = await clientRepository.find();
  if (clients.length === 0) {
    console.log('Error: No se encontraron clientes para crear historial de chat');
    return;
  }

  // Obtener canales
  const channels = await channelRepository.find();
  if (channels.length === 0) {
    console.log('Error: No se encontraron canales para crear historial de chat');
    return;
  }

  // Crear historial de chat de ejemplo para el primer cliente y canal de WhatsApp
  const whatsappChannel = channels.find(c => c.name === 'WhatsApp Ventas');
  if (whatsappChannel) {
    const chatHistory = [
      {
        channelId: whatsappChannel.id,
        clientId: clients[0].id,
        messageId: '1234567890',
        message: '¡Hola! Me gustaría obtener información sobre sus productos',
        direction: 'inbound',
      },
      {
        channelId: whatsappChannel.id,
        clientId: clients[0].id,
        messageId: '1234567891',
        message: '¡Bienvenido a nuestra tienda! ¿En qué puedo ayudarte?',
        direction: 'outbound',
      },
      {
        channelId: whatsappChannel.id,
        clientId: clients[0].id,
        messageId: '1234567892',
        message: 'Me interesan los productos de tecnología',
        direction: 'inbound',
      },
      {
        channelId: whatsappChannel.id,
        clientId: clients[0].id,
        messageId: '1234567893',
        message: 'Perfecto, te muestro nuestro catálogo de productos tecnológicos',
        direction: 'outbound',
      }
    ];

    for (const messageData of chatHistory) {
      const message = chatHistoryRepository.create(messageData);
      await chatHistoryRepository.save(message);
      console.log(`Mensaje de chat creado para Cliente ID: ${message.clientId}`);
    }
  }

  // Crear historial de chat de ejemplo para el segundo cliente y canal de Instagram
  const instagramChannel = channels.find(c => c.name === 'Instagram Soporte');
  if (instagramChannel) {
    const chatHistory = [
      {
        channelId: instagramChannel.id,
        clientId: clients[1].id,
        message: 'Necesito ayuda con un problema técnico',
        direction: 'inbound',
      },
      {
        channelId: instagramChannel.id,
        clientId: clients[1].id,
        message: 'Por supuesto, ¿podrías describir el problema que estás experimentando?',
        direction: 'outbound',
      },
      {
        channelId: instagramChannel.id,
        clientId: clients[1].id,
        message: 'Mi dispositivo no enciende correctamente',
        direction: 'inbound',
      },
      {
        channelId: instagramChannel.id,
        clientId: clients[1].id,
        message: 'Entiendo, vamos a realizar un diagnóstico paso a paso',
        direction: 'outbound',
      }
    ];

    for (const messageData of chatHistory) {
      const message = chatHistoryRepository.create(messageData);
      await chatHistoryRepository.save(message);
      console.log(`Mensaje de chat creado para Cliente ID: ${message.clientId}`);
    }
  }
};