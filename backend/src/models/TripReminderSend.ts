import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TripReminderWhatsappStatus =
  | 'text_sent'
  | 'template_sent'
  | 'skipped_no_phone'
  | 'failed';

interface TripReminderSendAttributes {
  id: string;
  tripId: string;
  participantId: string;
  clientId?: string | null;
  sendDate: Date | string;
  whatsappStatus: TripReminderWhatsappStatus;
  errorMessage?: string | null;
  createdAt?: Date;
}

interface TripReminderSendCreationAttributes
  extends Optional<TripReminderSendAttributes, 'id' | 'clientId' | 'errorMessage' | 'createdAt'> {}

export class TripReminderSend
  extends Model<TripReminderSendAttributes, TripReminderSendCreationAttributes>
  implements TripReminderSendAttributes
{
  public id!: string;
  public tripId!: string;
  public participantId!: string;
  public clientId!: string | null;
  public sendDate!: Date | string;
  public whatsappStatus!: TripReminderWhatsappStatus;
  public errorMessage!: string | null;
  public readonly createdAt!: Date;
}

TripReminderSend.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'trip_id',
      references: { model: 'trips', key: 'id' },
      onDelete: 'CASCADE',
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'participant_id',
      references: { model: 'trip_participants', key: 'id' },
      onDelete: 'CASCADE',
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'client_id',
      references: { model: 'clients', key: 'id' },
      onDelete: 'SET NULL',
    },
    sendDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'send_date',
    },
    whatsappStatus: {
      type: DataTypes.ENUM('text_sent', 'template_sent', 'skipped_no_phone', 'failed'),
      allowNull: false,
      field: 'whatsapp_status',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
  },
  {
    sequelize,
    tableName: 'trip_reminder_sends',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
