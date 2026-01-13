import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Calendar } from './calendar.entity';
import { Client } from '@/modules/clients/entities/client.entity';

export enum EventType {
  APPOINTMENT = 'appointment',
  BLOCK = 'block',
  HOLIDAY = 'holiday'
}

@Entity('calendar_events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'calendar_id' })
  calendarId: string;

  @Column({ name: 'client_id', nullable: true })
  clientId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column()
  duration: number;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.APPOINTMENT
  })
  type: EventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Calendar, calendar => calendar.events)
  @JoinColumn({ name: 'calendar_id' })
  calendar: Calendar;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}