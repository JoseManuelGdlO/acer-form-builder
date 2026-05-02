'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [permRows] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE \`key\` IN ('visa_status_templates.view','visa_status_templates.create','visa_status_templates.update','visa_status_templates.delete')`,
        { transaction }
      );
      const permIds = (permRows || []).map((r) => r.id).filter(Boolean);
      const sequelize = queryInterface.sequelize;
      if (permIds.length > 0) {
        // MySQL + sequelize.query: `bind` can leave `?` unreplaced in raw SQL; use escape() for IN lists.
        const inList = permIds.map((id) => sequelize.escape(id)).join(',');
        await sequelize.query(`DELETE FROM role_permissions WHERE permission_id IN (${inList})`, {
          transaction,
        });
        await sequelize.query(`DELETE FROM permissions WHERE id IN (${inList})`, {
          transaction,
        });
      }

      await queryInterface.removeColumn('clients', 'visa_status_template_id', { transaction });

      await queryInterface.removeColumn('clients', 'visa_cas_appointment_date', { transaction });
      await queryInterface.removeColumn('clients', 'visa_consular_appointment_date', { transaction });
      await queryInterface.removeColumn('clients', 'visa_cas_appointment_location', { transaction });
      await queryInterface.removeColumn('clients', 'visa_consular_appointment_location', { transaction });

      await queryInterface.removeColumn('trips', 'is_visa_trip', { transaction });
      await queryInterface.removeColumn('trips', 'cas_departure_date', { transaction });
      await queryInterface.removeColumn('trips', 'cas_return_date', { transaction });
      await queryInterface.removeColumn('trips', 'consulate_departure_date', { transaction });
      await queryInterface.removeColumn('trips', 'consulate_return_date', { transaction });

      await queryInterface.dropTable('visa_status_templates', { transaction });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  async down() {
    throw new Error('remove-visa-domain-pivot-to-travel: down() not supported (restore from backup)');
  },
};
