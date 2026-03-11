'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('steps', {
            id: {
                type: Sequelize.STRING(255),
                primaryKey: true,
            },
            step: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            state:{
                type: Sequelize.STRING(255),
                allowNull: true,
            }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('steps');
    },
};
