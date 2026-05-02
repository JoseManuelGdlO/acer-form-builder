'use strict';

const { randomUUID } = require('crypto');

const NEW_KEYS = [
  'nav.hotels.view',
  'hotels.view',
  'hotels.create',
  'hotels.update',
  'hotels.delete',
];

/** Reviewer: same pattern as products (view catalog only) */
const REVIEWER_HOTEL_KEYS = ['nav.hotels.view', 'hotels.view'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      'SELECT `key` FROM permissions WHERE `key` IN (:keys)',
      { replacements: { keys: NEW_KEYS }, type: Sequelize.QueryTypes.SELECT }
    );
    const existingSet = new Set(existing.map((r) => r.key));
    const toInsert = NEW_KEYS.filter((k) => !existingSet.has(k)).map((key) => ({
      id: randomUUID(),
      key,
      description: null,
      created_at: now,
      updated_at: now,
    }));
    if (toInsert.length) {
      await queryInterface.bulkInsert('permissions', toInsert);
    }

    const permRows = await queryInterface.sequelize.query(
      'SELECT id, `key` AS perm_key FROM permissions WHERE `key` IN (:keys)',
      { replacements: { keys: NEW_KEYS }, type: Sequelize.QueryTypes.SELECT }
    );
    const keyToId = {};
    for (const row of permRows) {
      keyToId[row.perm_key] = row.id;
    }

    const superAdmins = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE system_key = 'super_admin'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const reviewers = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE system_key = 'reviewer'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const bulk = [];
    for (const r of superAdmins) {
      for (const key of NEW_KEYS) {
        const pid = keyToId[key];
        if (pid) {
          bulk.push({
            role_id: r.id,
            permission_id: pid,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }
    for (const r of reviewers) {
      for (const key of REVIEWER_HOTEL_KEYS) {
        const pid = keyToId[key];
        if (pid) {
          bulk.push({
            role_id: r.id,
            permission_id: pid,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    if (bulk.length === 0) return;

    const existingLinks = await queryInterface.sequelize.query(
      'SELECT role_id, permission_id FROM role_permissions',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const linkSet = new Set(existingLinks.map((x) => `${x.role_id}:${x.permission_id}`));
    const toLink = bulk.filter((b) => !linkSet.has(`${b.role_id}:${b.permission_id}`));
    if (toLink.length) {
      await queryInterface.bulkInsert('role_permissions', toLink);
    }
  },

  async down(queryInterface, Sequelize) {
    const permRows = await queryInterface.sequelize.query(
      'SELECT id FROM permissions WHERE `key` IN (:keys)',
      { replacements: { keys: NEW_KEYS }, type: Sequelize.QueryTypes.SELECT }
    );
    const ids = permRows.map((r) => r.id);
    if (ids.length === 0) return;
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids });
    await queryInterface.bulkDelete('permissions', { id: ids });
  },
};
