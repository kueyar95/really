import { Funnel } from '../../modules/funnels/entities/funnel.entity';
import { FunnelChannel } from '../../modules/funnels/entities/funnel-channel.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { Channel } from '../../modules/channels/persistence/entities/channel.entity';
import { AppDataSource } from './seed-config';

export const seedFunnels = async () => {
  const funnelRepository = AppDataSource.getRepository(Funnel);
  const funnelChannelRepository = AppDataSource.getRepository(FunnelChannel);
  const companyRepository = AppDataSource.getRepository(Company);
  const channelRepository = AppDataSource.getRepository(Channel);

  // Obtener la primera compañía
  const company = await companyRepository.findOne({
    where: { name: 'Empresa Demo 1' },
  });

  if (!company) {
    return;
  }

  // Obtener los canales
  const channels = await channelRepository.find({
    where: { companyId: company.id },
  });

  if (channels.length === 0) {
    return;
  }

  const whatsappChannel = channels.find(c => c.name === 'WhatsApp Ventas');
  const instagramChannel = channels.find(c => c.name === 'Instagram Soporte');
  const telegramChannel = channels.find(c => c.name === 'Telegram Marketing');

  const funnels = [
    {
      companyId: company.id,
      name: 'Funnel Ventas Productos',
      description: 'Funnel para venta de productos principales',
      isActive: true,
      channels: [whatsappChannel, telegramChannel]
    },
    {
      companyId: company.id,
      name: 'Funnel Captación Stages',
      description: 'Funnel para captación y calificación de stages',
      isActive: true,
      channels: [whatsappChannel, instagramChannel, telegramChannel]
    },
    {
      companyId: company.id,
      name: 'Funnel Soporte Técnico',
      description: 'Funnel para atención de soporte técnico',
      isActive: true,
      channels: [instagramChannel, whatsappChannel]
    }
  ];

  for (const funnelData of funnels) {
    const { channels, ...funnelInfo } = funnelData;

    const existingFunnel = await funnelRepository.findOne({
      where: {
        name: funnelInfo.name,
        companyId: company.id
      },
    });

    if (!existingFunnel) {
      // Crear el funnel
      const funnel = funnelRepository.create(funnelInfo);
      await funnelRepository.save(funnel);

      // Crear las relaciones con los canales
      for (const channel of channels) {
        if (channel) {
          const funnelChannel = funnelChannelRepository.create({
            funnelId: funnel.id,
            channelId: channel.id
          });
          await funnelChannelRepository.save(funnelChannel);
        }
      }
    }
  }
};