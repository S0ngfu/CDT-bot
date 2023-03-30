'use strict';

const { Grossiste, Employee, Bill, BillModel, Fuel, OpStock, TransfertGrossiste, VehicleTaken } = require('../src/dbObjects');

const moment = require('moment');
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const employees = await Employee.findAll();

		for (const employee of employees) {
			const start = moment(employee.date_hiring);
			const end = employee.date_firing ? moment(employee.date_firing) : moment();

			await Grossiste.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
						timestamp: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);

			await VehicleTaken.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
					},
				},
			);

			await Bill.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
						date_bill: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);

			await BillModel.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
					},
				},
			);

			await Fuel.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
						date_fuel: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);

			await OpStock.update(
				{
					id_employe: employee.id,
				},
				{
					where: {
						id_employe: employee.id_employee,
						timestamp: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);

			await TransfertGrossiste.update(
				{
					id_employe_giver: employee.id,
				},
				{
					where: {
						id_employe_giver: employee.id_employee,
						timestamp: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);
			await TransfertGrossiste.update(
				{
					id_employe_receiver: employee.id,
				},
				{
					where: {
						id_employe_receiver: employee.id_employee,
						timestamp: { [Sequelize.Op.between]: [+start, +end] },
					},
				},
			);
		}
	},

	async down(queryInterface, Sequelize) {
		//
	},
};
