'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		console.log('test');
		await queryInterface.addColumn('products', 'qt_warn', {
			type: Sequelize.INTEGER,
			defaultValue: 0,
		});
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('products', 'qt_warn');
	},
};
