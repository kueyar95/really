import { Channel } from '../../modules/channels/persistence/entities/channel.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { AppDataSource } from './seed-config';
import { ChannelType, ChannelStatus } from '../../modules/channels/core/types/channel.types';

export const seedChannels = async () => {
  const channelRepository = AppDataSource.getRepository(Channel);
  const companyRepository = AppDataSource.getRepository(Company);

  // Obtener la primera compañía para asociar los canales
  const company = await companyRepository.findOne({
    where: { name: 'Empresa Demo 1' },
  });

  if (!company) {
    return;
  }

  const channels = [
    {
      companyId: company.id,
      type: ChannelType.WHATSAPP_WEB,
      number: '+56912345678',
      name: 'WhatsApp Ventas',
      connectionConfig: {
        sessionId: 'demo-ventas',
        qrCode: null
      },
      status: ChannelStatus.INACTIVE
    },
    {
      companyId: company.id,
      type: ChannelType.INSTAGRAM,
      name: 'Instagram Soporte',
      connectionConfig: {
        accessToken: null,
        pageId: 'demo-page'
      },
      status: ChannelStatus.INACTIVE
    },
    {
      companyId: company.id,
      type: ChannelType.TELEGRAM,
      name: 'Telegram Marketing',
      connectionConfig: {
        botToken: null,
        webhookUrl: null
      },
      status: ChannelStatus.INACTIVE
    }
  ];

  for (const channelData of channels) {
    const existingChannel = await channelRepository.findOne({
      where: {
        name: channelData.name,
        companyId: company.id
      },
    });

    if (!existingChannel) {
      const channel = channelRepository.create(channelData);
      await channelRepository.save(channel);
    }
  }
};