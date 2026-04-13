import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WhatsappIntegrationAttributes {
  id: string;
  companyId: string;
  phoneNumberId: string;
  accessToken: string;
  graphApiVersion: string;
  templateLanguage: string;
  initialTemplateName: string;
  displayPhoneNumber: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WhatsappIntegrationCreationAttributes
  extends Optional<
    WhatsappIntegrationAttributes,
    | 'id'
    | 'graphApiVersion'
    | 'templateLanguage'
    | 'initialTemplateName'
    | 'displayPhoneNumber'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class WhatsappIntegration
  extends Model<WhatsappIntegrationAttributes, WhatsappIntegrationCreationAttributes>
  implements WhatsappIntegrationAttributes
{
  public id!: string;
  public companyId!: string;
  public phoneNumberId!: string;
  public accessToken!: string;
  public graphApiVersion!: string;
  public templateLanguage!: string;
  public initialTemplateName!: string;
  public displayPhoneNumber!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WhatsappIntegration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    phoneNumberId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'phone_number_id',
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token',
    },
    graphApiVersion: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'v22.0',
      field: 'graph_api_version',
    },
    templateLanguage: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'es_MX',
      field: 'template_language',
    },
    initialTemplateName: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: 'mensaje_inicial',
      field: 'initial_template_name',
    },
    displayPhoneNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'display_phone_number',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'whatsapp_integrations',
    timestamps: true,
    underscored: true,
  }
);
