export interface ChecklistTemplate {
  id: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
}

export const DEFAULT_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  { id: '1', label: 'Derecho a visa', order: 0, isActive: true, createdAt: new Date() },
  { id: '2', label: 'Cita agendada', order: 1, isActive: true, createdAt: new Date() },
  { id: '3', label: 'Contacto cliente previo a cita', order: 2, isActive: true, createdAt: new Date() },
  { id: '4', label: 'Pegado y listo para viaje', order: 3, isActive: true, createdAt: new Date() },
];
