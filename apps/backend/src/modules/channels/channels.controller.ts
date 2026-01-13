import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Query, Logger, Req, NotFoundException } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ConnectChannelDto } from './dto/connect-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChannelType } from './core/types/channel.types';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { ConnectWhatsappDto } from './dto/connect-whatsapp.dto';
import { WhatsAppCloudConfigDto } from './dto/whatsapp-cloud-config.dto';
import { CreateWhapiChannelDto } from './dto/create-whapi-channel.dto';

@Controller('channels')
export class ChannelsController {
  private readonly logger = new Logger('ChannelsController');

  constructor(private readonly channelsService: ChannelsService) { }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() createChannelDto: CreateChannelDto) {
    return this.channelsService.create(createChannelDto);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  findAll(@Query('companyId') companyId: string) {
    // Validar que companyId sea un UUID válido si se proporciona
    if (companyId && companyId !== 'undefined' && companyId.trim() !== '') {
      return this.channelsService.findByCompany(companyId);
    }
    return this.channelsService.findAll();
  }

  @Get(':id/status')
  @UseGuards(SupabaseAuthGuard)
  async getStatus(@Param('id') id: string) {
    return this.channelsService.getChannelsStatus(id);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() updateChannelDto: UpdateChannelDto) {
    return this.channelsService.update(id, updateChannelDto);
  }

  // Eliminar por id — aquí añadimos DEBUG para confirmar que llega la solicitud
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('force') force?: string,
    @Req() req?: Request,
  ) {
    const t0 = Date.now();
    const requestId = req?.headers['x-request-id'] ?? 'n/a';
    //this.logger.log(
      //`[DELETE /channels/${id}] hit requestId=${requestId} ua=${req?.headers['user-agent']} force=${force ?? 'false'}`,
    //);

    try {
      await this.channelsService.remove(id, force === 'true');
     // this.logger.log(
     //   `[DELETE /channels/${id}] ok in ${Date.now() - t0}ms`,
     // );
      return { ok: true };
    } catch (err: any) {
      //this.logger.error(
        //`[DELETE /channels/${id}] ERROR: ${err?.message}`,
        //err?.stack,
      //);
      throw err;
    }
  }

  @Post('connect')
  @UseGuards(SupabaseAuthGuard)
  async connect(@Body() connectChannelDto: ConnectChannelDto) {
    const result = await this.channelsService.connect(connectChannelDto);
    return {
      channel: result,
      message: 'Si es un nuevo canal de WhatsApp Web, por favor espere el código QR a través de la conexión WebSocket.'
    };
  }

  @Post(':id/disconnect')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  disconnect(@Param('id') id: string) {
    return this.channelsService.disconnect(id);
  }

  @Post(':id/connect')
  async connectById(
    @Param('id') channelId: string,
    @Req() req: Request & { user?: any; companyId?: string },
  ) {
    // x-company-id puede venir como string | string[] | undefined
    const headerCompanyIdRaw = req.headers['x-company-id'];
    const headerCompanyId =
      Array.isArray(headerCompanyIdRaw) ? headerCompanyIdRaw[0] : headerCompanyIdRaw;

    const companyId =
      req?.user?.companyId ??
      req?.companyId ??
      (headerCompanyId as string | undefined) ??
      null;

    return this.channelsService.connectChannel({ channelId, companyId });
  }


  @Post(':id/send')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  sendMessage(
    @Param('id') id: string,
    @Body() payload: SendMessageDto,
  ) {
    return this.channelsService.sendMessage(id, payload);
  }

  @Post('webhook/:type')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('type') type: ChannelType,
    @Body() data: any,
  ) {
    await this.channelsService.handleWebhook(type, data);
    return { success: true };
  }

  @Post('connect/whatsapp')
  @UseGuards(SupabaseAuthGuard)
  async connectWhatsapp(@Body() connectWhatsappDto: ConnectWhatsappDto) {
    await this.channelsService.connectWhatsapp(connectWhatsappDto);
    return { message: 'Proceso de conexión iniciado. Por favor, espere el código QR.' };
  }

  @Post(':id/whatsapp-cloud/config')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async configureWhatsAppCloud(
    @Param('id') id: string,
    @Body() config: WhatsAppCloudConfigDto
  ) {
    await this.channelsService.configureWhatsAppCloud(id, config);
    return { message: 'Configuración de WhatsApp Cloud API actualizada exitosamente' };
  }

  @Post('whatsapp-cloud/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWhatsAppWebhook(
    @Body() data: any,
  ) {
    try {
      if (data.object === 'whatsapp_business_account') {
        for (const entry of data.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const messages = change.value.messages;
              const contacts = change.value.contacts;
              if (messages && messages.length > 0) {
                this.channelsService.handleWhatsAppCloudMessage(
                  change.value.metadata.phone_number_id,
                  messages[0],
                  contacts?.[0]
                );
              }
            }
          }
        }
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Error procesando webhook:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('whapi-cloud/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWhapiCloudWebhook(@Body() data: any) {
    try {
      //this.logger.log('Recibido webhook de Whapi.Cloud');

      // Extraer channel_id del payload
      const channelId = data.channel_id;

      if (!channelId) {
        this.logger.warn('Webhook recibido sin channel_id');
        return { success: false, error: 'No se proporcionó channel_id' };
      }

      //this.logger.log(`Procesando webhook para channel_id: ${channelId}`);

      // Pasar el channel_id como identificador
      await this.channelsService.handleWebhook(
        ChannelType.WHAPI_CLOUD,
        data,
        channelId
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error procesando webhook de Whapi.Cloud: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Get('whatsapp-cloud/webhook')
  @HttpCode(HttpStatus.OK)
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    //this.logger.log('Verifying webhook with mode:', mode);
    if (mode === 'subscribe') {
      return challenge;
    }
    return { success: false };
  }

  @Post('whapi-cloud/initiate')
  // @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiateWhapiCloudConnection(@Body() createWhapiChannelDto: CreateWhapiChannelDto) {
    const channel = await this.channelsService.initiateWhapiCloudConnection(createWhapiChannelDto);
    return {
      channelId: channel.id,
      status: channel.status,
      message: 'Proceso de conexión iniciado a través de la API Partner. Por favor, espere el código QR por WebSocket.'
    };
  }

  @Get('whapi-cloud/by-company/:companyId')
  @UseGuards(SupabaseAuthGuard)
  async getWhapiCloudChannelsByCompany(@Param('companyId') companyId: string) {
    return this.channelsService.findByCompanyAndType(companyId, ChannelType.WHAPI_CLOUD);
  }

  @Post('whapi-cloud/sync-status')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async syncWhapiChannelsStatus(@Query('companyId') companyId?: string) {
    const updatedCount = await this.channelsService.syncWhapiChannelsStatus(companyId);
    return {
      message: `Sincronización completada. ${updatedCount} canales actualizados.`,
      updatedCount
    };
  }

  @Post('reconnect-phone')
  @UseGuards(SupabaseAuthGuard)
  async reconnectPhone(
    @Body() body: { phoneNumber: string; companyId: string }
  ) {
    const channel = await this.channelsService.reconnectPhoneToChannel(
      body.phoneNumber,
      body.companyId
    );

    if (!channel) {
      throw new NotFoundException(`No se encontró canal para el número ${body.phoneNumber}`);
    }

    return {
      channel,
      message: 'Proceso de reconexión iniciado. Por favor, escanee el código QR.'
    };
  }

}
