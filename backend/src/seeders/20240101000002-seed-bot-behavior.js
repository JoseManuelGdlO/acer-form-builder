'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('bot_behavior', [
      {
        id: Sequelize.literal('UUID()'),
        name: 'Asistente Saru',
        greeting: '¡Hola! Soy el asistente virtual de Saru Visas. ¿En qué puedo ayudarte hoy?',
        personality: 'Soy un asistente amable y profesional especializado en trámites de visa y pasaporte. Mi objetivo es ayudar a resolver dudas de manera clara y eficiente.',
        tone: 'professional',
        fallback_message: 'Lo siento, no tengo información sobre esa consulta. Por favor, contacta a nuestro equipo de soporte para más ayuda.',
        response_delay: 500,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('bot_behavior', null, {});
  },
};
