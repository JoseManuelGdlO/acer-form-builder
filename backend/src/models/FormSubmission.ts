import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Form } from './Form';
import { Client } from './Client';

interface FormSubmissionAttributes {
  id: string;
  formId: string;
  formName: string;
  respondentName: string;
  respondentEmail: string;
  respondentPhone?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  answers: Record<string, string | string[]>;
  clientId?: string;
  submittedAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

interface FormSubmissionCreationAttributes extends Optional<FormSubmissionAttributes, 'id' | 'submittedAt' | 'createdAt' | 'updatedAt'> {}

export class FormSubmission extends Model<FormSubmissionAttributes, FormSubmissionCreationAttributes> implements FormSubmissionAttributes {
  public id!: string;
  public formId!: string;
  public formName!: string;
  public respondentName!: string;
  public respondentEmail!: string;
  public respondentPhone?: string;
  public status!: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  public answers!: Record<string, string | string[]>;
  public clientId?: string;
  public submittedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FormSubmission.init(
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
    formName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    respondentName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    respondentEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    respondentPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Client,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'form_submissions',
    timestamps: true,
    underscored: true,
  }
);
