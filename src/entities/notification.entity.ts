import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType } from '../common/enums';
import { User } from './user.entity';
import { Request } from './request.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id', nullable: true })
  request_id: number;

  @Column({ name: 'user_id', nullable: false })
  user_id: number;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({
    name: 'notification_type',
    type: 'enum',
    enum: NotificationType,
    nullable: false,
  })
  notification_type: NotificationType;

  @Column({ name: 'is_read', default: false, nullable: false })
  is_read: boolean;

  @Column({ name: 'is_sent', default: false, nullable: false })
  is_sent: boolean;

  @Column({ name: 'sent_at', nullable: true })
  sent_at: Date;

  @Column({ name: 'read_at', nullable: true })
  read_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Request, (request) => request.notifications, {
    nullable: true,
  })
  @JoinColumn({ name: 'request_id' })
  request: Request;
}
