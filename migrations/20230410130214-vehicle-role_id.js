'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('vehicles', 'role_id', {
			type: Sequelize.STRING,
		});
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('vehicles', 'role_id');
	},
};
