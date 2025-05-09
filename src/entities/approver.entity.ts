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
import { ApproverType } from '../common/enums';
import { User } from './user.entity';
import { Department } from './department.entity';
import { ApprovalLog } from './approval-log.entity';

@Entity('approvers')
export class Approver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: false })
  user_id: number;

  @Column({ name: 'department_id', nullable: false })
  department_id: number;

  @Column({
    type: 'enum',
    enum: ApproverType,
    nullable: false,
  })
  approver_type: ApproverType;

  @Column({ name: 'approval_level', nullable: false })
  approval_level: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.approvers)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Department, (department) => department.approvers)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => ApprovalLog, (approvalLog) => approvalLog.approver)
  approval_logs: ApprovalLog[];
}
