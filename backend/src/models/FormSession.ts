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
  formId: string;
  progress: FormSessionProgress;
  status: 'in_progress' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

interface FormSessionCreationAttributes extends Optional<FormSessionAttributes, 'id' | 'progress' | 'status' | 'createdAt' | 'updatedAt'> {}

export class FormSession extends Model<FormSessionAttributes, FormSessionCreationAttributes> implements FormSessionAttributes {
  public id!: string;
  public formId!: string;
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
    formId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Form,
        key: 'id',
      },
      onDelete: 'CASCADE',
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
