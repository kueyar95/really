#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChannelsService } from '../src/modules/channels/channels.service';
import { Logger } from '@nestjs/common';

async function syncWhapiChannels() {
  const logger = new Logger('SyncWhapiChannels');
  
  try {
    logger.log('Iniciando sincronización de canales Whapi.Cloud...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const channelsService = app.get(ChannelsService);
    
    // Sincronizar todos los canales
    const updatedCount = await channelsService.syncWhapiChannelsStatus();
    
    logger.log(`Sincronización completada. ${updatedCount} canales actualizados.`);
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Error durante la sincronización: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar el script
syncWhapiChannels(); 