'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@saruvisas.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrador';

    const companies = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyRow = Array.isArray(companies) ? companies[0] : null;
    const companyId = companyRow?.id ?? null;
    if (!companyId) {
      console.log('Default company (saru) not found. Run migrations first.');
      return;
    }

    const existingUser = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email AND company_id = :companyId`,
      {
        replacements: { email: adminEmail, companyId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (existingUser.length > 0) {
      console.log('Admin user already exists, skipping seed...');
      return;
    }

    const roleRows = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE company_id = :companyId AND system_key = 'super_admin' LIMIT 1`,
      {
        replacements: { companyId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const roleRow = Array.isArray(roleRows) ? roleRows[0] : null;
    const roleId = roleRow?.id ?? null;
    if (!roleId) {
      console.log('Super admin role not found for company. Run RBAC migration first.');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await queryInterface.bulkInsert('users', [
      {
        id: Sequelize.literal('UUID()'),
        company_id: companyId,
        role_id: roleId,
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: super_admin (role_id)`);
  },

  async down(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@saruvisas.com';

    const userRows = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      {
        replacements: { email: adminEmail },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (userRows.length > 0) {
      const userId = userRows[0].id;
      await queryInterface.bulkDelete('users', { id: userId });
    }

    const companies = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyRow = Array.isArray(companies) ? companies[0] : null;
    const companyId = companyRow?.id ?? null;
    if (companyId) {
      await queryInterface.bulkDelete('users', {
        email: adminEmail,
        company_id: companyId,
      });
    }
  },
};
