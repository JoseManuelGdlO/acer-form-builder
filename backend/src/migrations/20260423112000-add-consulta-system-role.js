'use strict';

const { randomUUID } = require('crypto');

const CONSULTA_PERMISSION_KEYS = [
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
  'client_financials.view',
  'client_payments.view',
  'client_audit_logs.view',
  'submissions.view_all',
  'client_messages.view',
  'client_notes.view',
  'client_checklist.view',
  'appointments.view',
  'forms.view',
  'products.view',
  'categories.view',
  'trips.view',
  'trip_invitations.view',
  'trip_bus_templates.view',
  'trip_finance.view',
  'companies.view',
  'finance.view',
  'payment_logs.view',
  'users.view',
  'roles.view',
  'branches.view',
  'company_branding.view',
  'visa_status_templates.view',
  'checklist_templates.view',
  'faqs.view',
  'bot_behavior.view',
  'groups.view',
  'notifications.view',
  'conversations.view',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const companies = await queryInterface.sequelize.query('SELECT id FROM companies', {
      type: Sequelize.QueryTypes.SELECT,
    });
    const permissionRows = await queryInterface.sequelize.query(
      'SELECT id, `key` AS perm_key FROM permissions WHERE `key` IN (:keys)',
      { replacements: { keys: CONSULTA_PERMISSION_KEYS }, type: Sequelize.QueryTypes.SELECT }
    );
    const permissionIds = permissionRows.map((row) => row.id);

    for (const company of companies) {
      const companyId = company.id;
      const existing = await queryInterface.sequelize.query(
        'SELECT id FROM roles WHERE company_id = :companyId AND system_key = :systemKey LIMIT 1',
        {
          replacements: { companyId, systemKey: 'consulta' },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      let roleId = existing[0]?.id;
      if (!roleId) {
        roleId = randomUUID();
        await queryInterface.bulkInsert('roles', [
          {
            id: roleId,
            company_id: companyId,
            name: 'Consulta',
            description: 'Rol de sistema de solo lectura',
            is_system: true,
            system_key: 'consulta',
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      if (permissionIds.length > 0) {
        const existingLinks = await queryInterface.sequelize.query(
          'SELECT permission_id FROM role_permissions WHERE role_id = :roleId',
          { replacements: { roleId }, type: Sequelize.QueryTypes.SELECT }
        );
        const linkedIds = new Set(existingLinks.map((row) => row.permission_id));
        const toInsert = permissionIds
          .filter((pid) => !linkedIds.has(pid))
          .map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
            created_at: now,
            updated_at: now,
          }));
        if (toInsert.length) {
          await queryInterface.bulkInsert('role_permissions', toInsert);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE system_key = 'consulta'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const roleIds = roles.map((r) => r.id);
    if (roleIds.length === 0) return;
    await queryInterface.bulkDelete('role_permissions', { role_id: roleIds });
    await queryInterface.bulkDelete('roles', { id: roleIds });
  },
};
