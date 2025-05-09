import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from '../common/enums';
import { Request } from './request.entity';
import { Approver } from './approver.entity';

@Entity('approval_logs')
export class ApprovalLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id', nullable: false })
  request_id: number;

  @Column({ name: 'approver_id', nullable: false })
  approver_id: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    nullable: false,
  })
  approval_status: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Request, (request) => request.approval_logs)
  @JoinColumn({ name: 'request_id' })
  request: Request;

  @ManyToOne(() => Approver, (approver) => approver.approval_logs)
  @JoinColumn({ name: 'approver_id' })
  approver: Approver;
}
