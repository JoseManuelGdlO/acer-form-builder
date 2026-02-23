import sequelize from '../config/database';
import { Company } from './Company';
import { User } from './User';
import { UserRole } from './UserRole';
import { Client } from './Client';
import { Form } from './Form';
import { FormSession } from './FormSession';
import { FormSubmission } from './FormSubmission';
import { ChecklistTemplate } from './ChecklistTemplate';
import { ClientChecklist } from './ClientChecklist';
import { ClientNote } from './ClientNote';
import { ClientPayment } from './ClientPayment';
import { ClientAmountDueLog } from './ClientAmountDueLog';
import { ClientPaymentDeletedLog } from './ClientPaymentDeletedLog';
import { ClientMessage } from './ClientMessage';
import { FAQ } from './FAQ';
import { BotBehavior } from './BotBehavior';
import { Conversations } from './Conversation';

// Company relationships (multi-tenant)
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Client, { foreignKey: 'companyId', as: 'clients' });
Client.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Form, { foreignKey: 'companyId', as: 'forms' });
Form.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(FormSubmission, { foreignKey: 'companyId', as: 'submissions' });
FormSubmission.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(FormSession, { foreignKey: 'companyId', as: 'sessions' });
FormSession.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ChecklistTemplate, { foreignKey: 'companyId', as: 'checklistTemplates' });
ChecklistTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientChecklist, { foreignKey: 'companyId', as: 'clientChecklists' });
ClientChecklist.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientNote, { foreignKey: 'companyId', as: 'clientNotes' });
ClientNote.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientPayment, { foreignKey: 'companyId', as: 'clientPayments' });
ClientPayment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientAmountDueLog, { foreignKey: 'companyId', as: 'clientAmountDueLogs' });
ClientAmountDueLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientPaymentDeletedLog, { foreignKey: 'companyId', as: 'clientPaymentDeletedLogs' });
ClientPaymentDeletedLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientMessage, { foreignKey: 'companyId', as: 'clientMessages' });
ClientMessage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(FAQ, { foreignKey: 'companyId', as: 'faqs' });
FAQ.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(BotBehavior, { foreignKey: 'companyId', as: 'botBehaviors' });
BotBehavior.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// User relationships
User.hasMany(UserRole, { foreignKey: 'userId', as: 'roles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Client, { foreignKey: 'assignedUserId', as: 'assignedClients' });
Client.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

User.hasMany(ClientNote, { foreignKey: 'createdBy', as: 'createdNotes' });
ClientNote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(ClientMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ClientMessage.belongsTo(User, { foreignKey: 'senderId', as: 'senderUser' });

// Client relationships
Client.hasMany(FormSubmission, { foreignKey: 'clientId', as: 'submissions' });
FormSubmission.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientChecklist, { foreignKey: 'clientId', as: 'checklistItems' });
ClientChecklist.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientNote, { foreignKey: 'clientId', as: 'clientNotes' });
ClientNote.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientPayment, { foreignKey: 'clientId', as: 'clientPayments' });
ClientPayment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientAmountDueLog, { foreignKey: 'clientId', as: 'amountDueLogs' });
ClientAmountDueLog.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

User.hasMany(ClientAmountDueLog, { foreignKey: 'changedBy', as: 'amountDueChanges' });
ClientAmountDueLog.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

Client.hasMany(ClientPaymentDeletedLog, { foreignKey: 'clientId', as: 'paymentDeletedLogs' });
ClientPaymentDeletedLog.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

User.hasMany(ClientPaymentDeletedLog, { foreignKey: 'deletedBy', as: 'paymentDeletedByUser' });
ClientPaymentDeletedLog.belongsTo(User, { foreignKey: 'deletedBy', as: 'deletedByUser' });

Client.hasMany(ClientMessage, { foreignKey: 'clientId', as: 'messages' });
ClientMessage.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// Form relationships
Form.hasMany(FormSession, { foreignKey: 'formId', as: 'sessions' });
FormSession.belongsTo(Form, { foreignKey: 'formId', as: 'form' });
User.hasMany(FormSession, { foreignKey: 'assignedUserId', as: 'assignedFormSessions' });
FormSession.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

Form.hasMany(FormSubmission, { foreignKey: 'formId', as: 'submissions' });
FormSubmission.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

// Checklist relationships
ChecklistTemplate.hasMany(ClientChecklist, { foreignKey: 'templateId', as: 'clientChecklists' });
ClientChecklist.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

export {
  sequelize,
  Company,
  User,
  UserRole,
  Client,
  Form,
  FormSession,
  FormSubmission,
  ChecklistTemplate,
  ClientChecklist,
  ClientNote,
  ClientPayment,
  ClientAmountDueLog,
  ClientPaymentDeletedLog,
  ClientMessage,
  FAQ,
  BotBehavior,
  Conversations,
};
