import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('patient_links')
@Unique(['companyId', 'phoneE164'])
@Index('idx_patient_link_company', ['companyId'])
@Index('idx_patient_link_phone', ['phoneE164'])
export class PatientLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'phone_e164' })
  phoneE164: string;

  @Column({ name: 'medilink_patient_id' })
  medilinkPatientId: string;

  @Column({ name: 'patient_data', type: 'jsonb', nullable: true })
  patientData: {
    nombre?: string;
    apellidos?: string;
    rut?: string;
    email?: string;
    fechaNacimiento?: string;
  };

  @Column({ name: 'opt_in_whatsapp', type: 'boolean', default: false })
  optInWhatsapp: boolean;

  @Column({ name: 'opt_in_date', type: 'timestamp', nullable: true })
  optInDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
