import sequelize from '../config/database';
import { Company } from './Company';
import { User } from './User';
import { Permission } from './Permission';
import { Role } from './Role';
import { RolePermission } from './RolePermission';
import { Branch } from './Branch';
import { Client } from './Client';
import { Form } from './Form';
import { FormSession } from './FormSession';
import { FormSubmission } from './FormSubmission';
import { ChecklistTemplate } from './ChecklistTemplate';
import { ClientChecklist } from './ClientChecklist';
import { ClientNote } from './ClientNote';
import { ClientPayment } from './ClientPayment';
import { ClientAcquiredPackage } from './ClientAcquiredPackage';
import { ClientAmountDueLog } from './ClientAmountDueLog';
import { ClientPaymentDeletedLog } from './ClientPaymentDeletedLog';
import { TripExpense } from './TripExpense';
import { FinanceExpense } from './FinanceExpense';
import { ClientMessage } from './ClientMessage';
import { ClientGroup } from './ClientGroup';
import { ClientGroupMember } from './ClientGroupMember';
import { BusTemplate } from './BusTemplate';
import { Trip } from './Trip';
import { TripCompany } from './TripCompany';
import { TripInvitation } from './TripInvitation';
import { TripParticipant } from './TripParticipant';
import { TripGroup } from './TripGroup';
import { TripSeatAssignment } from './TripSeatAssignment';
import { TripChangeLog } from './TripChangeLog';
import { FAQ } from './FAQ';
import { BotBehavior } from './BotBehavior';
import { Conversations } from './Conversation';
import { Notification } from './Notification';
import { NotificationRecipient } from './NotificationRecipient';
import { Product } from './Product';
import { ProductCategory } from './ProductCategory';
import { Category } from './Category';
import { VisaStatusTemplate } from './VisaStatusTemplate';
import { PushSubscription } from './PushSubscription';
import { InternalAppointment } from './InternalAppointment';
import { InternalAppointmentHistory } from './InternalAppointmentHistory';
import { WhatsappIntegration } from './WhatsappIntegration';

// Company relationships (multi-tenant)
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Branch, { foreignKey: 'companyId', as: 'branches' });
Branch.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Branch.hasMany(User, { foreignKey: 'branchId', as: 'usersByBranch' });
User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
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
Company.hasMany(ClientAcquiredPackage, { foreignKey: 'companyId', as: 'clientAcquiredPackages' });
ClientAcquiredPackage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientAmountDueLog, { foreignKey: 'companyId', as: 'clientAmountDueLogs' });
ClientAmountDueLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientPaymentDeletedLog, { foreignKey: 'companyId', as: 'clientPaymentDeletedLogs' });
ClientPaymentDeletedLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(ClientMessage, { foreignKey: 'companyId', as: 'clientMessages' });
ClientMessage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(BusTemplate, { foreignKey: 'companyId', as: 'busTemplates' });
BusTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(FAQ, { foreignKey: 'companyId', as: 'faqs' });
FAQ.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(BotBehavior, { foreignKey: 'companyId', as: 'botBehaviors' });
BotBehavior.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Product, { foreignKey: 'companyId', as: 'products' });
Product.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(VisaStatusTemplate, { foreignKey: 'companyId', as: 'visaStatusTemplates' });
VisaStatusTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Conversations, { foreignKey: 'companyId', as: 'conversations' });
Conversations.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasOne(WhatsappIntegration, { foreignKey: 'companyId', as: 'whatsappIntegration' });
WhatsappIntegration.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Notifications relationships (multi-tenant)
Company.hasMany(Notification, { foreignKey: 'companyId', as: 'notifications' });
Notification.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Notification.hasMany(NotificationRecipient, {
  foreignKey: 'notificationId',
  as: 'recipients',
});
NotificationRecipient.belongsTo(Notification, {
  foreignKey: 'notificationId',
  as: 'notification',
});

User.hasMany(NotificationRecipient, {
  foreignKey: 'recipientUserId',
  as: 'notificationRecipients',
});
NotificationRecipient.belongsTo(User, {
  foreignKey: 'recipientUserId',
  as: 'recipient',
});

Company.hasMany(PushSubscription, {
  foreignKey: 'companyId',
  as: 'pushSubscriptions',
});
PushSubscription.belongsTo(Company, {
  foreignKey: 'companyId',
  as: 'company',
});
User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptionsByUser' });
PushSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Company.hasMany(InternalAppointment, { foreignKey: 'companyId', as: 'internalAppointments' });
InternalAppointment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(InternalAppointmentHistory, { foreignKey: 'companyId', as: 'internalAppointmentHistory' });
InternalAppointmentHistory.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Category relationships
Company.hasMany(Category, { foreignKey: 'companyId', as: 'categories' });
Category.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Product relationships
Product.hasMany(ProductCategory, { foreignKey: 'productId', as: 'categories' });
ProductCategory.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Client, { foreignKey: 'productId', as: 'clients' });
Client.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
VisaStatusTemplate.hasMany(Client, { foreignKey: 'visaStatusTemplateId', as: 'clients' });
Client.belongsTo(VisaStatusTemplate, { foreignKey: 'visaStatusTemplateId', as: 'visaStatusTemplate' });

// Roles & permissions (RBAC)
Company.hasMany(Role, { foreignKey: 'companyId', as: 'roles' });
Role.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

User.hasMany(Client, { foreignKey: 'assignedUserId', as: 'assignedClients' });
Client.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

User.hasMany(ClientNote, { foreignKey: 'createdBy', as: 'createdNotes' });
ClientNote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(ClientMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ClientMessage.belongsTo(User, { foreignKey: 'senderId', as: 'senderUser' });

// Client relationships
Client.belongsTo(Client, { foreignKey: 'parentClientId', as: 'parent' });
Client.hasMany(Client, { foreignKey: 'parentClientId', as: 'children' });

Client.hasMany(FormSubmission, { foreignKey: 'clientId', as: 'submissions' });
FormSubmission.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientChecklist, { foreignKey: 'clientId', as: 'checklistItems' });
ClientChecklist.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientNote, { foreignKey: 'clientId', as: 'clientNotes' });
ClientNote.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(ClientPayment, { foreignKey: 'clientId', as: 'clientPayments' });
ClientPayment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Trip.hasMany(ClientPayment, { foreignKey: 'tripId', as: 'payments' });
ClientPayment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

Client.hasMany(ClientAcquiredPackage, { foreignKey: 'parentClientId', as: 'acquiredPackages' });
ClientAcquiredPackage.belongsTo(Client, { foreignKey: 'parentClientId', as: 'parentClient' });
Client.hasMany(ClientAcquiredPackage, { foreignKey: 'beneficiaryClientId', as: 'beneficiaryAcquiredPackages' });
ClientAcquiredPackage.belongsTo(Client, { foreignKey: 'beneficiaryClientId', as: 'beneficiary' });
Product.hasMany(ClientAcquiredPackage, { foreignKey: 'productId', as: 'acquiredPackages' });
ClientAcquiredPackage.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ClientPayment.belongsTo(ClientAcquiredPackage, { foreignKey: 'acquiredPackageId', as: 'acquiredPackage' });
ClientAcquiredPackage.hasMany(ClientPayment, { foreignKey: 'acquiredPackageId', as: 'payments' });

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
Client.hasMany(InternalAppointment, { foreignKey: 'clientId', as: 'internalAppointments' });
InternalAppointment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// ClientGroup relationships
User.hasMany(ClientGroup, { foreignKey: 'assignedUserId', as: 'assignedGroups' });
ClientGroup.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });
ClientGroup.belongsToMany(Client, { through: ClientGroupMember, foreignKey: 'groupId', otherKey: 'clientId', as: 'clients' });
Client.belongsToMany(ClientGroup, { through: ClientGroupMember, foreignKey: 'clientId', otherKey: 'groupId', as: 'groups' });
ClientGroupMember.belongsTo(ClientGroup, { foreignKey: 'groupId', as: 'group' });
ClientGroupMember.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// Trip relationships
Company.hasMany(Trip, { foreignKey: 'companyId', as: 'trips' });
Trip.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.hasMany(Trip, { foreignKey: 'assignedUserId', as: 'assignedTrips' });
Trip.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

Trip.belongsTo(BusTemplate, { foreignKey: 'busTemplateId', as: 'busTemplate' });
BusTemplate.hasMany(Trip, { foreignKey: 'busTemplateId', as: 'trips' });
Trip.hasMany(TripCompany, { foreignKey: 'tripId', as: 'tripCompanies' });
TripCompany.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripCompany.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(TripCompany, { foreignKey: 'companyId', as: 'tripCompanies' });

Trip.hasMany(TripInvitation, { foreignKey: 'tripId', as: 'invitations' });
TripInvitation.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripInvitation.belongsTo(Company, { foreignKey: 'invitedCompanyId', as: 'invitedCompany' });
TripInvitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'invitedByUser' });
TripInvitation.belongsTo(User, { foreignKey: 'respondedBy', as: 'respondedByUser' });
User.hasMany(TripInvitation, { foreignKey: 'invitedBy', as: 'sentTripInvitations' });

Trip.hasMany(TripParticipant, { foreignKey: 'tripId', as: 'participants' });
TripParticipant.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripParticipant.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(TripParticipant, { foreignKey: 'clientId', as: 'tripParticipants' });

Trip.hasMany(TripGroup, { foreignKey: 'tripId', as: 'tripGroups' });
TripGroup.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripGroup.belongsTo(ClientGroup, { foreignKey: 'groupId', as: 'group' });
ClientGroup.hasMany(TripGroup, { foreignKey: 'groupId', as: 'tripGroups' });

Trip.hasMany(TripSeatAssignment, { foreignKey: 'tripId', as: 'seatAssignments' });
TripSeatAssignment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripSeatAssignment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(TripSeatAssignment, { foreignKey: 'clientId', as: 'tripSeatAssignments' });
TripSeatAssignment.belongsTo(TripParticipant, { foreignKey: 'participantId', as: 'participant' });
TripParticipant.hasMany(TripSeatAssignment, { foreignKey: 'participantId', as: 'seatAssignments' });

Trip.hasMany(TripChangeLog, { foreignKey: 'tripId', as: 'changeLog' });
TripChangeLog.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
TripChangeLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(TripChangeLog, { foreignKey: 'userId', as: 'tripChangeLogs' });
Company.hasMany(TripExpense, { foreignKey: 'companyId', as: 'tripExpenses' });
TripExpense.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Trip.hasMany(TripExpense, { foreignKey: 'tripId', as: 'expenses' });
TripExpense.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
User.hasMany(TripExpense, { foreignKey: 'createdBy', as: 'createdTripExpenses' });
TripExpense.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });
Company.hasMany(FinanceExpense, { foreignKey: 'companyId', as: 'financeExpenses' });
FinanceExpense.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.hasMany(FinanceExpense, { foreignKey: 'createdBy', as: 'createdFinanceExpenses' });
FinanceExpense.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });
User.hasMany(InternalAppointment, { foreignKey: 'appointedByUserId', as: 'createdInternalAppointments' });
InternalAppointment.belongsTo(User, { foreignKey: 'appointedByUserId', as: 'appointedByUser' });
InternalAppointment.hasMany(InternalAppointmentHistory, { foreignKey: 'appointmentId', as: 'history' });
InternalAppointmentHistory.belongsTo(InternalAppointment, { foreignKey: 'appointmentId', as: 'appointment' });
User.hasMany(InternalAppointmentHistory, { foreignKey: 'changedByUserId', as: 'internalAppointmentChanges' });
InternalAppointmentHistory.belongsTo(User, { foreignKey: 'changedByUserId', as: 'changedByUser' });

// Form relationships
Form.hasMany(FormSession, { foreignKey: 'formId', as: 'sessions' });
FormSession.belongsTo(Form, { foreignKey: 'formId', as: 'form' });
User.hasMany(FormSession, { foreignKey: 'assignedUserId', as: 'assignedFormSessions' });
FormSession.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });
Client.hasMany(FormSession, { foreignKey: 'clientId', as: 'formSessions' });
FormSession.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Form.hasMany(FormSubmission, { foreignKey: 'formId', as: 'submissions' });
FormSubmission.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

// Checklist relationships
ChecklistTemplate.hasMany(ClientChecklist, { foreignKey: 'templateId', as: 'clientChecklists' });
ClientChecklist.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

export {
  sequelize,
  Company,
  Branch,
  User,
  Permission,
  Role,
  RolePermission,
  Notification,
  NotificationRecipient,
  Client,
  ClientGroup,
  ClientGroupMember,
  BusTemplate,
  Trip,
  TripCompany,
  TripInvitation,
  TripParticipant,
  TripGroup,
  TripSeatAssignment,
  TripChangeLog,
  Form,
  FormSession,
  FormSubmission,
  ChecklistTemplate,
  ClientChecklist,
  ClientNote,
  ClientPayment,
  ClientAcquiredPackage,
  ClientAmountDueLog,
  ClientPaymentDeletedLog,
  TripExpense,
  FinanceExpense,
  ClientMessage,
  FAQ,
  BotBehavior,
  Conversations,
  Product,
  ProductCategory,
  Category,
  VisaStatusTemplate,
  PushSubscription,
  InternalAppointment,
  InternalAppointmentHistory,
  WhatsappIntegration,
};
