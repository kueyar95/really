import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  MedilinkService,
  MedilinkBranch,
  MedilinkProfessional,
  MedilinkChair,
  MedilinkAppointmentState,
  MedilinkPatient,
  MedilinkAttention,
} from './medilink.service';
import { ConnectMedilinkDto, ValidateMedilinkDto, DisconnectMedilinkDto } from './dto/connect-medilink.dto';
import { GetAvailabilityDto, AvailabilityResponseDto } from './dto/availability.dto';
import { ScheduleAppointmentDto, AppointmentCreatedDto } from './dto/schedule.dto';
import { RescheduleAppointmentDto, RescheduleResponseDto } from './dto/reschedule.dto';
import { CancelAppointmentDto, CancelResponseDto } from './dto/cancel.dto';
// TODO: Import guards when available
// import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../auth/guards/roles.guard';
// import { Roles } from '../../../auth/decorators/roles.decorator';

@ApiTags('Medilink')
@Controller('integrations/medilink')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedilinkController {
  constructor(private readonly medilinkService: MedilinkService) {}

  // === ENDPOINTS DE ADMINISTRACIÓN ===

  @Post('connect')
  // @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Conectar integración con Medilink' })
  @ApiResponse({ status: 201, description: 'Integración conectada exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o error de conexión' })
  async connect(@Request() req, @Body() dto: ConnectMedilinkDto) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.connect(companyId, dto);
  }

  @Post('validate')
  // @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Validar conexión existente con Medilink' })
  @ApiResponse({ status: 200, description: 'Conexión válida' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  async validate(@Request() req, @Body() dto: ValidateMedilinkDto) {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.validate(companyId);
  }

  @Post('disconnect')
  // @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconectar integración con Medilink' })
  @ApiResponse({ status: 204, description: 'Integración desconectada' })
  async disconnect(@Request() req, @Body() dto: DisconnectMedilinkDto) {
    const companyId = req.user?.companyId || 'test-company-id';
    await this.medilinkService.disconnect(companyId);
  }

  @Get('metadata')
  // @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener metadata de la integración' })
  @ApiResponse({ status: 200, description: 'Metadata obtenida exitosamente' })
  async getMetadata(@Request() req) {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.getIntegrationMetadata(companyId);
  }

  @Get('branches')
  // @Roles('admin', 'super_admin', 'user')
  @ApiOperation({ summary: 'Listar sucursales disponibles' })
  async listBranches(@Request() req): Promise<MedilinkBranch[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.listBranches(companyId);
  }

  @Get('professionals')
  // @Roles('admin', 'super_admin', 'user')
  @ApiOperation({ summary: 'Listar profesionales disponibles' })
  async listProfessionals(
    @Request() req,
    @Query('branchId') branchId?: string,
  ): Promise<MedilinkProfessional[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.listProfessionals(companyId, branchId);
  }

  @Get('branches/:branchId/chairs')
  // @Roles('admin', 'super_admin', 'user')
  @ApiOperation({ summary: 'Obtener sillones de una sucursal' })
  async getChairs(
    @Request() req,
    @Param('branchId') branchId: string,
  ): Promise<MedilinkChair[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.getChairs(companyId, branchId);
  }

  @Get('appointment-states')
  // @Roles('admin', 'super_admin', 'user')
  @ApiOperation({ summary: 'Listar estados de cita disponibles' })
  async listAppointmentStates(@Request() req): Promise<MedilinkAppointmentState[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.listAppointmentStates(companyId);
  }

  @Get('services')
  // @Roles('admin', 'super_admin', 'user')
  @ApiOperation({ summary: 'Listar servicios o especialidades disponibles' })
  async listServices(@Request() req): Promise<{ id: string; name: string }[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.listServices(companyId);
  }

  // === ENDPOINTS DE BOT ===

  @Post('availability')
  @ApiOperation({ summary: 'Obtener disponibilidad de agenda' })
  @ApiResponse({ 
    status: 200, 
    description: 'Slots disponibles',
    type: AvailabilityResponseDto,
  })
  async getAvailability(@Request() req, @Body() dto: GetAvailabilityDto) {
    const companyId = req.user?.companyId || 'test-company-id';
    const slots = await this.medilinkService.getAvailability(companyId, dto);
    
    return {
      slots,
      hasMore: false, // TODO: Implement pagination
    };
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Agendar nueva cita' })
  @ApiResponse({ 
    status: 201, 
    description: 'Cita agendada exitosamente',
    type: AppointmentCreatedDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Error al agendar cita (ej. falta atención)',
  })
  async scheduleAppointment(
    @Request() req,
    @Body() dto: ScheduleAppointmentDto,
  ): Promise<AppointmentCreatedDto> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.createAppointment(companyId, dto);
  }

  @Put('reschedule')
  @ApiOperation({ summary: 'Reagendar cita existente' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cita reagendada exitosamente',
    type: RescheduleResponseDto,
  })
  async rescheduleAppointment(
    @Request() req,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<RescheduleResponseDto> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.rescheduleAppointment(companyId, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancelar cita' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cita cancelada exitosamente',
    type: CancelResponseDto,
  })
  async cancelAppointment(
    @Request() req,
    @Body() dto: CancelAppointmentDto,
  ): Promise<CancelResponseDto> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.cancelAppointment(companyId, dto);
  }

  // === ENDPOINTS DE PACIENTES ===

  @Get('patients/search')
  @ApiOperation({ summary: 'Buscar pacientes' })
  async searchPatients(
    @Request() req,
    @Query('q') query: string,
  ): Promise<MedilinkPatient[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.searchPatient(companyId, query);
  }

  @Get('patients/:patientId/attentions')
  @ApiOperation({ summary: 'Listar atenciones de un paciente' })
  async getPatientAttentions(
    @Request() req,
    @Param('patientId') patientId: string,
  ): Promise<MedilinkAttention[]> {
    const companyId = req.user?.companyId || 'test-company-id';
    return this.medilinkService.listPatientAttentions(companyId, patientId);
  }
}
