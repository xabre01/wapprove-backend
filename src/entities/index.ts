import { User } from './user.entity';
import { Account } from './account.entity';
import { Department } from './department.entity';
import { Approver } from './approver.entity';
import { Request } from './request.entity';
import { RequestItem } from './request-item.entity';
import { ApprovalLog } from './approval-log.entity';
import { Notification } from './notification.entity';

export {
  User,
  Account,
  Department,
  Approver,
  Request,
  RequestItem,
  ApprovalLog,
  Notification,
};

export const entities = [
  User,
  Account,
  Department,
  Approver,
  Request,
  RequestItem,
  ApprovalLog,
  Notification,
];
