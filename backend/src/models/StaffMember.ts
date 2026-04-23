import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StaffMemberAttributes {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  role: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffMemberCreationAttributes extends Optional<StaffMemberAttributes, 'id' | 'phone' | 'role' | 'notes' | 'createdAt' | 'updatedAt'> {}

export class StaffMember extends Model<StaffMemberAttributes, StaffMemberCreationAttributes> implements StaffMemberAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public phone!: string | null;
  public role!: string | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StaffMember.init(
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
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'staff_members',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['company_id', 'name'] },
    ],
  }
);
