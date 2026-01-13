import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Event } from './event.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Entity()
export class Calendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true })
  googleCalendarId: string;

  @Column({ default: '09:00' })
  startHour: string;

  @Column({ default: '18:00' })
  endHour: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Event, event => event.calendar)
  events: Event[];
}