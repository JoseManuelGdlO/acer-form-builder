'use strict';

/**
 * Seeds theme for the default company (saru).
 * Theme keys match CSS variables in front/src/index.css (without --).
 * Values are HSL without hsl() wrapper, e.g. "234 66% 30%".
 *
 * Idempotente: si ya hay un theme guardado (colores, fondo, logos en JSON, etc.),
 * no lo sobrescribe para no perder branding al re-ejecutar seeds en deploy.
 */
function parseThemeRow(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function themeHasAnyKey(theme) {
  return theme && typeof theme === 'object' && Object.keys(theme).length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const rows = await queryInterface.sequelize.query(
      `SELECT id, theme FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const row = rows?.[0];
    const companyId = row?.id ?? null;
    if (!companyId) {
      console.log('Default company (saru) not found. Run migrations first.');
      return;
    }

    const existing = parseThemeRow(row.theme);
    if (themeHasAnyKey(existing)) {
      console.log('Company theme already set; skipping seed to preserve branding.');
      return;
    }

    const theme = {
      'primary': '234 66% 30%',
      'primary-foreground': '0 0% 100%',
      'secondary': '0 67% 47%',
      'secondary-foreground': '0 0% 100%',
      'background': '0 0% 100%',
      'foreground': '0 0% 18%',
      'card': '0 0% 100%',
      'card-foreground': '0 0% 18%',
      'muted': '234 20% 95%',
      'muted-foreground': '0 0% 45%',
      'accent': '230 45% 47%',
      'accent-foreground': '0 0% 100%',
      'destructive': '0 67% 47%',
      'destructive-foreground': '0 0% 100%',
      'border': '234 20% 90%',
      'input': '234 20% 90%',
      'ring': '234 66% 30%',
      'radius': '0.75rem',
      'success': '142 71% 45%',
      'success-foreground': '0 0% 100%',
      'warning': '38 92% 50%',
      'warning-foreground': '0 0% 100%',
      'info': '230 45% 47%',
      'info-foreground': '0 0% 100%',
      'sidebar-background': '234 66% 30%',
      'sidebar-foreground': '0 0% 100%',
      'sidebar-primary': '0 67% 47%',
      'sidebar-primary-foreground': '0 0% 100%',
      'sidebar-accent': '230 45% 47%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '234 50% 40%',
      'sidebar-ring': '0 67% 47%',
    };

    await queryInterface.sequelize.query(
      `UPDATE companies SET theme = :theme, updated_at = :now WHERE id = :companyId`,
      {
        replacements: {
          theme: JSON.stringify(theme),
          now: new Date(),
          companyId,
        },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );

    console.log('✅ Company theme seeded for saru.');
  },

  async down(queryInterface, Sequelize) {
    const rows = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyId = rows?.[0]?.id ?? null;
    if (!companyId) return;

    await queryInterface.sequelize.query(
      `UPDATE companies SET theme = NULL, updated_at = :now WHERE id = :companyId`,
      {
        replacements: { now: new Date(), companyId },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );
    console.log('Company theme cleared for saru.');
  },
};
