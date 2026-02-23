'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@saruvisas.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrador';

    const [companies] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyId = Array.isArray(companies) && companies[0] ? companies[0].id : null;
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

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await queryInterface.bulkInsert('users', [
      {
        id: Sequelize.literal('UUID()'),
        company_id: companyId,
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const createdUser = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email AND company_id = :companyId LIMIT 1`,
      {
        replacements: { email: adminEmail, companyId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (createdUser && createdUser.length > 0) {
      const userId = createdUser[0].id;

      // Create super_admin role for the user
      await queryInterface.bulkInsert('user_roles', [
        {
          id: Sequelize.literal('UUID()'),
          user_id: userId,
          role: 'super_admin',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      console.log(`✅ Admin user created successfully!`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: super_admin`);
    }
  },

  async down(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@saruvisas.com';
    
    // Get user ID
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      {
        replacements: { email: adminEmail },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (user && user.length > 0) {
      const userId = user[0].id;
      
      // Delete user role
      await queryInterface.bulkDelete('user_roles', {
        user_id: userId,
      });

      const [companies] = await queryInterface.sequelize.query(
        `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      const companyId = Array.isArray(companies) && companies[0] ? companies[0].id : null;
      await queryInterface.bulkDelete('users', {
        email: adminEmail,
        ...(companyId && { company_id: companyId }),
      });
    }
  },
};
