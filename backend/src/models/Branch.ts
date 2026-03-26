import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BranchAttributes {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BranchCreationAttributes
  extends Optional<BranchAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class Branch extends Model<BranchAttributes, BranchCreationAttributes> implements BranchAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Branch.init(
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
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'branches',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['company_id'],
      },
      {
        fields: ['company_id', 'name'],
        unique: true,
      },
    ],
  }
);

