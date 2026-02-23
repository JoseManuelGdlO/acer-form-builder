import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Form } from './Form';

export interface FormSessionProgress {
  clientInfo?: {
    name: string;
    email: string;
    phone: string;
    street: string;
    streetNumber: string;
    city: string;
    state: string;
    postalCode: string;
  };
  answers?: Record<string, string | string[] | string>; // stored as ISO string for dates
  step?: 'info' | 'sections' | 'success';
  currentSectionIndex?: number;
  savedAt?: string;
}

interface FormSessionAttributes {
  id: string;
  companyId: string;
  formId: string;
  assignedUserId?: string;
  clientId?: string;
  submissionId?: string;
  progress: FormSessionProgress;
  status: 'in_progress' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

interface FormSessionCreationAttributes extends Optional<FormSessionAttributes, 'id' | 'progress' | 'status' | 'createdAt' | 'updatedAt'> {}

export class FormSession extends Model<FormSessionAttributes, FormSessionCreationAttributes> implements FormSessionAttributes {
  public id!: string;
  public companyId!: string;
  public formId!: string;
  public assignedUserId?: string;
  public clientId?: string;
  public submissionId?: string;
  public progress!: FormSessionProgress;
  public status!: 'in_progress' | 'completed';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FormSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    formId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Form,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    submissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'form_submissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    progress: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'completed'),
      defaultValue: 'in_progress',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'form_sessions',
    timestamps: true,
    underscored: true,
  }
);
