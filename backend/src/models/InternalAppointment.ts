import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type InternalAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type InternalAppointmentOfficeRole = 'reviewer' | 'admin';

interface InternalAppointmentAttributes {
  id: string;
  companyId: string;
  clientId: string;
  appointmentDate: string;
  /** HH:mm opcional */
  appointmentTime?: string | null;
  appointedByUserId: string;
  officeRole: InternalAppointmentOfficeRole;
  purposeNote: string;
  status: InternalAppointmentStatus;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InternalAppointmentCreationAttributes
  extends Optional<
    InternalAppointmentAttributes,
    'id' | 'appointmentTime' | 'status' | 'completedAt' | 'cancelledAt' | 'createdAt' | 'updatedAt'
  > {}

export class InternalAppointment
  extends Model<InternalAppointmentAttributes, InternalAppointmentCreationAttributes>
  implements InternalAppointmentAttributes
{
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public appointmentDate!: string;
  public appointmentTime!: string | null;
  public appointedByUserId!: string;
  public officeRole!: InternalAppointmentOfficeRole;
  public purposeNote!: string;
  public status!: InternalAppointmentStatus;
  public completedAt!: Date | null;
  public cancelledAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InternalAppointment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    appointmentTime: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    appointedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
    },
    officeRole: {
      type: DataTypes.ENUM('reviewer', 'admin'),
      allowNull: false,
    },
    purposeNote: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'internal_appointments',
    timestamps: true,
    underscored: true,
  }
);
