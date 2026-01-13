import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'whatsapp_credentials' })
export class WhatsappCredentials {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'company_id' })
  companyId!: string;

  @Column({ name: 'waba_id', type: 'varchar', nullable: true })
  wabaId!: string | null;

  @Column({ name: 'phone_number_id', type: 'varchar', nullable: true })
  phoneNumberId!: string | null;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken!: string | null;

  @Column({ name: 'status', type: 'varchar', default: 'connected' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
