import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { ClientStage } from '../../clients/entities/client-stage.entity';
import { Role } from '../enums/role.enum';
import { Calendar } from '@/modules/calendar/entities/calendar.entity';
import { UUID } from 'crypto';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  @Column()
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.VENDEDOR
  })
  role: Role;

  @Column({ nullable: true, name: 'supabase_id' })
  supabaseId: UUID | '';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Company, company => company.users)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => ClientStage, clientStage => clientStage.assignedUser)
  assignedClientStages: ClientStage[];
}
