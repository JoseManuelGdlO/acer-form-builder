import sequelize from '../config/database';
import { User } from './User';
import { UserRole } from './UserRole';
import { Client } from './Client';
import { Form } from './Form';
import { FormSession } from './FormSession';
import { FormSubmission } from './FormSubmission';
import { ChecklistTemplate } from './ChecklistTemplate';
import { ClientChecklist } from './ClientChecklist';
import { ClientNote } from './ClientNote';
import { ClientMessage } from './ClientMessage';
import { FAQ } from './FAQ';
import { BotBehavior } from './BotBehavior';

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

Client.hasMany(ClientMessage, { foreignKey: 'clientId', as: 'messages' });
ClientMessage.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// Form relationships
Form.hasMany(FormSession, { foreignKey: 'formId', as: 'sessions' });
FormSession.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

Form.hasMany(FormSubmission, { foreignKey: 'formId', as: 'submissions' });
FormSubmission.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

// Checklist relationships
ChecklistTemplate.hasMany(ClientChecklist, { foreignKey: 'templateId', as: 'clientChecklists' });
ClientChecklist.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

export {
  sequelize,
  User,
  UserRole,
  Client,
  Form,
  FormSession,
  FormSubmission,
  ChecklistTemplate,
  ClientChecklist,
  ClientNote,
  ClientMessage,
  FAQ,
  BotBehavior,
};
