'use strict';

const { randomUUID } = require('crypto');

/** Must match backend/src/authorization/permissions.catalog.ts */
const PERMISSION_KEYS = [
  'nav.dashboard.view',
  'nav.clients.view',
  'nav.calendar.view',
  'nav.forms.view',
  'nav.products.view',
  'nav.trips.view',
  'nav.admin.view',
  'nav.finance.view',
  'nav.payment_logs.view',
  'nav.users.view',
  'nav.chatbot.view',
  'nav.settings.view',
  'nav.groups.view',
  'clients.view_all',
  'clients.view_assigned',
  'clients.create',
  'clients.update',
  'clients.delete',
  'clients.reassign_advisor',
  'client_financials.view',
  'client_financials.update',
  'client_payments.view',
  'client_payments.create',
  'client_payments.update',
  'client_payments.delete',
  'client_audit_logs.view',
  'submissions.view_all',
  'submissions.view_assigned',
  'submissions.update',
  'submissions.delete',
  'client_messages.view',
  'client_messages.create',
  'client_messages.update',
  'client_messages.delete',
  'client_notes.view',
  'client_notes.create',
  'client_notes.update',
  'client_notes.delete',
  'client_checklist.view',
  'client_checklist.update',
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'appointments.delete',
  'forms.view',
  'forms.create',
  'forms.update',
  'forms.delete',
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'categories.view',
  'categories.create',
  'categories.update',
  'categories.delete',
  'trips.view',
  'trips.create',
  'trips.update',
  'trips.delete',
  'trips.participants_manage',
  'trips.office_admin',
  'trip_invitations.view',
  'trip_invitations.create',
  'trip_invitations.update',
  'trip_invitations.delete',
  'trip_bus_templates.view',
  'trip_bus_templates.create',
  'trip_bus_templates.update',
  'trip_bus_templates.delete',
  'trip_finance.view',
  'companies.view',
  'finance.view',
  'payment_logs.view',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',
  'branches.view',
  'branches.create',
  'branches.update',
  'branches.delete',
  'company_branding.view',
  'company_branding.update',
  'visa_status_templates.view',
  'visa_status_templates.create',
  'visa_status_templates.update',
  'visa_status_templates.delete',
  'checklist_templates.view',
  'checklist_templates.create',
  'checklist_templates.update',
  'checklist_templates.delete',
  'faqs.view',
  'faqs.create',
  'faqs.update',
  'faqs.delete',
  'bot_behavior.view',
  'bot_behavior.update',
  'groups.view',
  'groups.create',
  'groups.update',
  'groups.delete',
  'notifications.view',
  'notifications.create',
  'notifications.update',
  'notifications.delete',
  'conversations.view',
  'conversations.update',
  'session.view_as',
];

/** Legacy reviewer: mirrors prior super_admin vs reviewer split */
const REVIEWER_PERMISSION_KEYS = [
  'nav.dashboard.view',
  'nav.clients.view',
  'nav.calendar.view',
  'nav.forms.view',
  'nav.products.view',
  'nav.trips.view',
  'clients.view_assigned',
  'clients.create',
  'clients.update',
  'clients.delete',
  'client_financials.view',
  'client_financials.update',
  'client_payments.view',
  'client_payments.create',
  'client_payments.update',
  'submissions.view_assigned',
  'submissions.update',
  'submissions.delete',
  'client_messages.view',
  'client_messages.create',
  'client_messages.update',
  'client_messages.delete',
  'client_notes.view',
  'client_notes.create',
  'client_notes.update',
  'client_notes.delete',
  'client_checklist.view',
  'client_checklist.update',
  'checklist_templates.view',
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'appointments.delete',
  'forms.view',
  'products.view',
  'trips.view',
  'trips.participants_manage',
  'trip_invitations.view',
  'notifications.view',
  'notifications.create',
  'notifications.update',
  'notifications.delete',
  'conversations.view',
  'conversations.update',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      key: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    const permissionRows = PERMISSION_KEYS.map((key) => ({
      id: randomUUID(),
      key,
      description: null,
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert('permissions', permissionRows);

    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      system_key: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('roles', ['company_id', 'system_key'], {
      unique: true,
      name: 'roles_company_system_key_unique',
    });

    await queryInterface.createTable('role_permissions', {
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      permission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    const companyList = await queryInterface.sequelize.query(
      'SELECT id FROM companies ORDER BY created_at ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const permList = await queryInterface.sequelize.query(
      'SELECT id, `key` AS perm_key FROM permissions',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const keyToPermId = {};
    for (const row of permList) {
      keyToPermId[row.perm_key] = row.id;
    }

    const rolePermissionBulk = [];

    for (const c of companyList) {
      const companyId = c.id;
      const superAdminRoleId = randomUUID();
      const reviewerRoleId = randomUUID();

      await queryInterface.bulkInsert('roles', [
        {
          id: superAdminRoleId,
          company_id: companyId,
          name: 'Super administrador',
          description: 'Acceso completo (rol de sistema)',
          is_system: true,
          system_key: 'super_admin',
          created_at: now,
          updated_at: now,
        },
        {
          id: reviewerRoleId,
          company_id: companyId,
          name: 'Revisor',
          description: 'Rol de sistema equivalente al revisor anterior',
          is_system: true,
          system_key: 'reviewer',
          created_at: now,
          updated_at: now,
        },
      ]);

      for (const key of PERMISSION_KEYS) {
        const pid = keyToPermId[key];
        if (pid) {
          rolePermissionBulk.push({
            role_id: superAdminRoleId,
            permission_id: pid,
            created_at: now,
            updated_at: now,
          });
        }
      }
      for (const key of REVIEWER_PERMISSION_KEYS) {
        const pid = keyToPermId[key];
        if (pid) {
          rolePermissionBulk.push({
            role_id: reviewerRoleId,
            permission_id: pid,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    if (rolePermissionBulk.length) {
      await queryInterface.bulkInsert('role_permissions', rolePermissionBulk);
    }

    await queryInterface.addColumn('users', 'role_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    });

    await queryInterface.sequelize.query(`
      UPDATE users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.company_id = u.company_id AND r.system_key = ur.role
      SET u.role_id = r.id
    `);

    await queryInterface.sequelize.query(`
      UPDATE users u
      INNER JOIN roles r ON r.company_id = u.company_id AND r.system_key = 'reviewer'
      SET u.role_id = r.id
      WHERE u.role_id IS NULL
    `);

    await queryInterface.dropTable('user_roles');

    await queryInterface.changeColumn('users', 'role_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    });

    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('super_admin', 'reviewer'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('user_roles', ['user_id', 'role'], { unique: true });
    await queryInterface.addIndex('user_roles', ['user_id']);

    await queryInterface.sequelize.query(`
      INSERT INTO user_roles (id, user_id, role, created_at, updated_at)
      SELECT UUID(), u.id, r.system_key, NOW(), NOW()
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id AND r.system_key IN ('super_admin','reviewer')
    `);

    await queryInterface.removeColumn('users', 'role_id');

    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('permissions');
  },
};
