import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BookingSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('booking_sessions')
@Index('idx_booking_session_company_phone', ['companyId', 'phoneE164'])
export class BookingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ name: 'phone_e164' })
  @Index()
  phoneE164: string;

  @Column({ name: 'patient_id', nullable: true })
  patientId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'professional_id', nullable: true })
  professionalId: string;

  @Column({ name: 'chair_id', nullable: true })
  chairId: string;

  @Column({ name: 'attention_id', nullable: true })
  attentionId: string;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId: string;

  @Column({ name: 'date_ymd', nullable: true })
  dateYmd: string;

  @Column({ name: 'time_hhmm', nullable: true })
  timeHhmm: string;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: BookingSessionStatus,
    default: BookingSessionStatus.ACTIVE,
  })
  status: BookingSessionStatus;

  @Column({ name: 'current_stage', nullable: true })
  currentStage: string;

  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context: {
    patientData?: any;
    availableSlots?: any[];
    selectedSlot?: any;
    preferences?: any;
    metadata?: any;
  };

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
