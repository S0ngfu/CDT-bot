'use strict';

const { Grossiste, Employee, Bill, BillModel, Fuel, OpStock, TransfertGrossiste, VehicleTaken } = require('../src/dbObjects');

const moment = require('moment');
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const employeesToCreate = [
	{
		name_employee: '172608328130756609',
		id_employee: '172608328130756609',
		date_hiring: moment('2022-03-28 00:00:00'),
		date_firing: moment('2022-05-10 23:59:59'),
	},
	{
		name_employee: '197016574928879616',
		id_employee: '197016574928879616',
		date_hiring: moment('2022-03-29 00:00:00'),
		date_firing: moment('2022-04-03 23:59:59'),
	},
	{
		name_employee: '204749079618519041',
		id_employee: '204749079618519041',
		date_hiring: moment('2022-04-12 00:00:00'),
		date_firing: moment('2022-05-14 23:59:59'),
	},
	{
		name_employee: '235419823117565952',
		id_employee: '235419823117565952',
		date_hiring: moment('2022-04-15 00:00:00'),
		date_firing: moment('2022-04-22 23:59:59'),
	},
	{
		name_employee: 'James Alburn',
		id_employee: '245279138909388800',
		date_hiring: moment('2022-04-15 00:00:00'),
		date_firing: moment('2022-04-26 23:59:59'),
	},
	{
		name_employee: 'Kjell Hopp',
		id_employee: '260482377153773568',
		date_hiring: moment('2022-01-11 00:00:00'),
		date_firing: moment('2022-05-18 23:59:59'),
	},
	{
		name_employee: 'Allen Harcours',
		id_employee: '311920738212773888',
		date_hiring: moment('2022-03-26 00:00:00'),
		date_firing: moment('2022-05-22 23:59:59'),
	},
	{
		name_employee: '427922783755042819',
		id_employee: '427922783755042819',
		date_hiring: moment('2022-03-21 00:00:00'),
		date_firing: moment('2022-04-19 23:59:59'),
	},
	{
		name_employee: '447367747521871873',
		id_employee: '447367747521871873',
		date_hiring: moment('2022-03-25 00:00:00'),
		date_firing: moment('2022-05-06 23:59:59'),
	},
	{
		name_employee: 'Margarett Ills',
		id_employee: '534029005381304322',
		date_hiring: moment('2022-03-22 00:00:00'),
		date_firing: moment('2022-04-12 23:59:59'),
	},
	{
		name_employee: '622015200119488542',
		id_employee: '622015200119488542',
		date_hiring: moment('2022-03-31 00:00:00'),
		date_firing: moment('2022-04-03 23:59:59'),
	},
	{
		name_employee: '937393336787009596',
		id_employee: '937393336787009596',
		date_hiring: moment('2022-03-27 00:00:00'),
		date_firing: moment('2022-04-07 23:59:59'),
	},
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {

		// Create missing employees
		for (const e of employeesToCreate) {
			await Employee.create(e);
		}

		// Fix problems with existing employees
		await Employee.update(
			{
				date_hiring: moment('2022-11-25 14:00:00'),
			},
			{
				where: {
					id_employee: '279746970510295041',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-05-12 00:00:00'),
			},
			{
				where: {
					id_employee: '334345556296073226',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-05-12 12:00:00'),
			},
			{
				where: {
					id_employee: '440089030374457347',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-11-16 12:00:00'),
			},
			{
				where: {
					id_employee: '531017285318475776',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-03-25 12:00:00'),
			},
			{
				where: {
					id_employee: '646447778096087071',
				},
			},
		);

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
