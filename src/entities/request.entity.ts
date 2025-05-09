import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RequestStatus, UrgencyLevel } from '../common/enums';
import { User } from './user.entity';
import { Department } from './department.entity';
import { RequestItem } from './request-item.entity';
import { ApprovalLog } from './approval-log.entity';
import { Notification } from './notification.entity';

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: false })
  user_id: number;

  @Column({ name: 'department_id', nullable: false })
  department_id: number;

  @Column({ name: 'request_code', length: 50, unique: true, nullable: false })
  request_code: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ name: 'status_note', type: 'text', nullable: true })
  status_note: string;

  @Column({ name: 'total_amount', type: 'float', nullable: true })
  total_amount: number;

  @Column({ name: 'current_approval_level', default: 1, nullable: false })
  current_approval_level: number;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.DRAFT,
    nullable: false,
  })
  status: RequestStatus;

  @Column({
    name: 'urgency_level',
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.MEDIUM,
    nullable: false,
  })
  urgency_level: UrgencyLevel;

  @Column({ name: 'request_date', nullable: false })
  request_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.requests)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Department, (department) => department.requests)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => RequestItem, (requestItem) => requestItem.request)
  request_items: RequestItem[];

  @OneToMany(() => ApprovalLog, (approvalLog) => approvalLog.request)
  approval_logs: ApprovalLog[];

  @OneToMany(() => Notification, (notification) => notification.request)
  notifications: Notification[];
}
