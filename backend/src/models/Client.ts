import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Product } from './Product';
import { VisaStatusTemplate } from './VisaStatusTemplate';

interface ClientAttributes {
  id: string;
  companyId: string;
  parentClientId?: string | null;
  name: string;
  email?: string;
  phone?: string;
  postalCode?: number | null;
  address?: string;
  birthDate?: string;
  relationshipToHolder?: string;
  notes?: string;
  visaCasAppointmentDate?: string;
  visaCasAppointmentLocation?: string;
  visaConsularAppointmentDate?: string;
  visaConsularAppointmentLocation?: string;
  status: 'active' | 'inactive' | 'pending';
  formsCompleted: number;
  assignedUserId?: string;
  visaStatusTemplateId: string;
  productId?: string;
  totalAmountDue?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientCreationAttributes extends Optional<ClientAttributes, 'id' | 'formsCompleted' | 'createdAt' | 'updatedAt'> {}

export class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public id!: string;
  public companyId!: string;
  public parentClientId?: string | null;
  public name!: string;
  public email?: string;
  public phone?: string;
  public postalCode?: number | null;
  public address?: string;
  public birthDate?: string;
  public relationshipToHolder?: string;
  public notes?: string;
  public visaCasAppointmentDate?: string;
  public visaCasAppointmentLocation?: string;
  public visaConsularAppointmentDate?: string;
  public visaConsularAppointmentLocation?: string;
  public status!: 'active' | 'inactive' | 'pending';
  public formsCompleted!: number;
  public assignedUserId?: string;
  public visaStatusTemplateId!: string;
  public productId?: string;
  public totalAmountDue?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Client.init(
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
    parentClientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    postalCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'postal_code',
      validate: {
        min: 10000,
        max: 99999,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    relationshipToHolder: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    visaCasAppointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    visaCasAppointmentLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    visaConsularAppointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    visaConsularAppointmentLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'pending',
      allowNull: false,
    },
    formsCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    visaStatusTemplateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: VisaStatusTemplate,
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Product,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    totalAmountDue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('totalAmountDue');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
  },
  {
    sequelize,
    tableName: 'clients',
    timestamps: true,
    underscored: true,
  }
);
