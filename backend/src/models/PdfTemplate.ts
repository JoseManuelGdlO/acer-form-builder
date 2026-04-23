import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PdfTemplateAttributes {
  id: string;
  companyId: string;
  formId: string;
  fileName: string;
  filePath: string;
  pageCount: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PdfTemplateCreationAttributes
  extends Optional<PdfTemplateAttributes, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'> {}

export class PdfTemplate extends Model<PdfTemplateAttributes, PdfTemplateCreationAttributes> implements PdfTemplateAttributes {
  public id!: string;
  public companyId!: string;
  public formId!: string;
  public fileName!: string;
  public filePath!: string;
  public pageCount!: number;
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PdfTemplate.init(
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
        model: 'forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'form_id',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path',
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'page_count',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
  },
  {
    sequelize,
    tableName: 'pdf_templates',
    timestamps: true,
    underscored: true,
  }
);
