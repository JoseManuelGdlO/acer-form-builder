import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

type InternalAppointmentHistoryAction = 'created' | 'updated' | 'status_changed' | 'deleted';

interface InternalAppointmentHistoryAttributes {
  id: string;
  appointmentId: string;
  companyId: string;
  action: InternalAppointmentHistoryAction;
  changedByUserId: string;
  beforeJson?: string | null;
  afterJson?: string | null;
  createdAt?: Date;
}

interface InternalAppointmentHistoryCreationAttributes
  extends Optional<InternalAppointmentHistoryAttributes, 'id' | 'beforeJson' | 'afterJson' | 'createdAt'> {}

export class InternalAppointmentHistory
  extends Model<InternalAppointmentHistoryAttributes, InternalAppointmentHistoryCreationAttributes>
  implements InternalAppointmentHistoryAttributes
{
  public id!: string;
  public appointmentId!: string;
  public companyId!: string;
  public action!: InternalAppointmentHistoryAction;
  public changedByUserId!: string;
  public beforeJson!: string | null;
  public afterJson!: string | null;
  public readonly createdAt!: Date;
}

InternalAppointmentHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'internal_appointments', key: 'id' },
      onDelete: 'CASCADE',
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    action: {
      type: DataTypes.ENUM('created', 'updated', 'status_changed', 'deleted'),
      allowNull: false,
    },
    changedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
    },
    beforeJson: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    afterJson: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'internal_appointment_history',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
