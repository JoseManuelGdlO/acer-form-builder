'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM companies WHERE slug = 'saru' LIMIT 1",
        { transaction }
      );
      const defaultCompanyId = rows && rows[0] ? rows[0].id : null;
      if (!defaultCompanyId) {
        throw new Error('Default company not found. Run create-companies migration first.');
      }

      const uuidCol = { type: Sequelize.UUID, allowNull: true };

      // 1. Add company_id nullable to all tables
      await queryInterface.addColumn('users', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('clients', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('forms', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('form_submissions', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('form_sessions', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('checklist_templates', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('client_checklist', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('client_notes', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('client_messages', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('faqs', 'company_id', uuidCol, { transaction });
      await queryInterface.addColumn('bot_behavior', 'company_id', uuidCol, { transaction });

      // 2. Backfill with default company
      await queryInterface.sequelize.query(
        `UPDATE users SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE clients SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE forms SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE form_submissions SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE form_sessions SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE checklist_templates SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE client_checklist SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE client_notes SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE client_messages SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE faqs SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE bot_behavior SET company_id = :id`,
        { replacements: { id: defaultCompanyId }, transaction }
      );

      // 3. Make company_id NOT NULL
      const notNullUuid = { type: Sequelize.UUID, allowNull: false };
      await queryInterface.changeColumn('users', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('clients', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('forms', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('form_submissions', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('form_sessions', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('checklist_templates', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('client_checklist', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('client_notes', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('client_messages', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('faqs', 'company_id', notNullUuid, { transaction });
      await queryInterface.changeColumn('bot_behavior', 'company_id', notNullUuid, { transaction });

      // 4. Add foreign keys (MySQL: addConstraint)
      const fk = (_table, name) => ({
        type: 'foreign key',
        name,
        fields: ['company_id'],
        references: { table: 'companies', field: 'id' },
        onDelete: 'CASCADE',
      });
      await queryInterface.addConstraint('users', fk('users', 'users_company_id_fk'), { transaction });
      await queryInterface.addConstraint('clients', fk('clients', 'clients_company_id_fk'), { transaction });
      await queryInterface.addConstraint('forms', fk('forms', 'forms_company_id_fk'), { transaction });
      await queryInterface.addConstraint('form_submissions', fk('form_submissions', 'form_submissions_company_id_fk'), { transaction });
      await queryInterface.addConstraint('form_sessions', fk('form_sessions', 'form_sessions_company_id_fk'), { transaction });
      await queryInterface.addConstraint('checklist_templates', fk('checklist_templates', 'checklist_templates_company_id_fk'), { transaction });
      await queryInterface.addConstraint('client_checklist', fk('client_checklist', 'client_checklist_company_id_fk'), { transaction });
      await queryInterface.addConstraint('client_notes', fk('client_notes', 'client_notes_company_id_fk'), { transaction });
      await queryInterface.addConstraint('client_messages', fk('client_messages', 'client_messages_company_id_fk'), { transaction });
      await queryInterface.addConstraint('faqs', fk('faqs', 'faqs_company_id_fk'), { transaction });
      await queryInterface.addConstraint('bot_behavior', fk('bot_behavior', 'bot_behavior_company_id_fk'), { transaction });

      // 5. Users: drop unique on email, add unique (company_id, email)
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === 'mysql') {
        const [indexes] = await queryInterface.sequelize.query("SHOW INDEX FROM users WHERE Column_name = 'email' AND Non_unique = 0", { transaction });
        const indexName = indexes && indexes[0] ? indexes[0].Key_name : 'email';
        await queryInterface.sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``, { transaction });
      } else {
        await queryInterface.removeIndex('users', 'users_email_unique', { transaction });
      }
      await queryInterface.addIndex('users', ['company_id', 'email'], { unique: true, name: 'users_company_id_email_unique', transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('users', 'users_company_id_email_unique', { transaction });
      await queryInterface.addIndex('users', ['email'], { unique: true, name: 'email', transaction });

      const constraints = [
        ['users', 'users_company_id_fk'],
        ['clients', 'clients_company_id_fk'],
        ['forms', 'forms_company_id_fk'],
        ['form_submissions', 'form_submissions_company_id_fk'],
        ['form_sessions', 'form_sessions_company_id_fk'],
        ['checklist_templates', 'checklist_templates_company_id_fk'],
        ['client_checklist', 'client_checklist_company_id_fk'],
        ['client_notes', 'client_notes_company_id_fk'],
        ['client_messages', 'client_messages_company_id_fk'],
        ['faqs', 'faqs_company_id_fk'],
        ['bot_behavior', 'bot_behavior_company_id_fk'],
      ];
      for (const [table, constraintName] of constraints) {
        await queryInterface.removeConstraint(table, constraintName, { transaction });
      }
      const tables = constraints.map(([t]) => t);
      for (const table of tables) {
        await queryInterface.removeColumn(table, 'company_id', { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
