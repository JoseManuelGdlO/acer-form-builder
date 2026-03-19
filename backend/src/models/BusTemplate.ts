import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type BathroomPosition = 'front' | 'middle' | 'back';

export type BusLayoutElementType = 'seat' | 'bathroom' | 'stairs' | 'door' | 'driver' | 'aisle' | 'blocked';

export interface BusLayoutCanvas {
  width: number;
  height: number;
  gridSize: number;
}

export interface BusLayoutElement {
  id: string;
  type: BusLayoutElementType;
  x: number;
  y: number;
  label?: string;
  width?: number;
  height?: number;
  rotation?: number;
  metadata?: Record<string, unknown>;
}

export interface BusLayoutFloor {
  elements: BusLayoutElement[];
}

export interface BusLayout {
  floors: BusLayoutFloor[];
  /**
   * Optional rendering hints. If missing, the frontend/backends must fallback to defaults.
   */
  canvas?: BusLayoutCanvas;
}

interface BusTemplateAttributes {
  id: string;
  companyId: string;
  name: string;
  totalSeats: number;
  rows: number;
  bathroomPosition: BathroomPosition;
  floors: number;
  stairsPosition?: string | null;
  seatLabels?: string[] | null;
  layout?: BusLayout | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BusTemplateCreationAttributes
  extends Optional<BusTemplateAttributes, 'id' | 'stairsPosition' | 'seatLabels' | 'layout' | 'createdAt' | 'updatedAt'> {}

export class BusTemplate
  extends Model<BusTemplateAttributes, BusTemplateCreationAttributes>
  implements BusTemplateAttributes
{
  public id!: string;
  public companyId!: string;
  public name!: string;
  public totalSeats!: number;
  public rows!: number;
  public bathroomPosition!: BathroomPosition;
  public floors!: number;
  public stairsPosition!: string | null;
  public seatLabels!: string[] | null;
  public layout!: BusLayout | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BusTemplate.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bathroomPosition: {
      type: DataTypes.ENUM('front', 'middle', 'back'),
      allowNull: false,
    },
    floors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    stairsPosition: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    seatLabels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    layout: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'bus_templates',
    timestamps: true,
    underscored: true,
  }
);
