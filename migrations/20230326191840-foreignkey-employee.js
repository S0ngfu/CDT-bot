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
		name_employee: 'Chris Jameson',
		id_employee: '488434999893295114',
		date_hiring: moment('2021-11-07 00:00:00'),
		date_firing: moment('2022-05-22 23:59:59'),
	},
	{
		name_employee: 'Eleanor Harden',
		id_employee: '720063767211147264',
		date_hiring: moment('2021-11-29 00:00:00'),
		date_firing: moment('2022-03-14 23:59:59'),
	},
	{
		name_employee: 'Ryan Junior',
		id_employee: '289178018943860736',
		date_hiring: moment('2021-12-10 00:00:00'),
		date_firing: moment('2022-01-20 23:59:59'),
	},
	{
		name_employee: 'Zek Pearson',
		id_employee: '439152752808165386',
		date_hiring: moment('2021-10-18 00:00:00'),
		date_firing: moment('2022-01-20 23:59:59'),
	},
	{
		name_employee: 'Robbie Fox',
		id_employee: '232518184308178944',
		date_hiring: moment('2022-01-14 00:00:00'),
		date_firing: moment('2022-01-25 23:59:59'),
	},
	{
		name_employee: 'Diego Alonzo',
		id_employee: '234990224097280001',
		date_hiring: moment('2021-08-29 00:00:00'),
		date_firing: moment('2022-02-06 23:59:59'),
	},
	{
		name_employee: 'Ray Tucker',
		id_employee: '301265046972137473',
		date_hiring: moment('2022-01-28 00:00:00'),
		date_firing: moment('2022-04-24 23:59:59'),
	},
	{
		name_employee: 'Max Peters',
		id_employee: '243027258594426880',
		date_hiring: moment('2022-02-12 00:00:00'),
		date_firing: moment('2022-04-23 23:59:59'),
	},
	{
		name_employee: 'Logan Ward',
		id_employee: '136527574825172992',
		date_hiring: moment('2022-02-13 00:00:00'),
		date_firing: moment('2022-02-20 23:59:59'),
	},
	{
		name_employee: 'Charlie Velour',
		id_employee: '246990139648114688',
		date_hiring: moment('2022-02-14 00:00:00'),
		date_firing: moment('2022-04-11 23:59:59'),
	},
	{
		name_employee: 'Ronald Sanson',
		id_employee: '302515138777579530',
		date_hiring: moment('2022-02-16 00:00:00'),
		date_firing: moment('2022-03-17 23:59:59'),
	},
	{
		name_employee: 'Erwan Gamble',
		id_employee: '298100546953543680',
		date_hiring: moment('2022-02-16 00:00:00'),
		date_firing: moment('2022-02-25 23:59:59'),
	},
	{
		name_employee: 'Aelyas Drake',
		id_employee: '379664648988786689',
		date_hiring: moment('2022-02-17 00:00:00'),
		date_firing: moment('2022-03-26 23:59:59'),
	},
	{
		name_employee: 'Serge Dupont',
		id_employee: '217319512058494976',
		date_hiring: moment('2022-02-18 00:00:00'),
		date_firing: moment('2022-02-22 23:59:59'),
	},
	{
		name_employee: 'Kane Braga',
		id_employee: '478272450413723648',
		date_hiring: moment('2022-01-20 00:00:00'),
		date_firing: moment('2022-02-21 23:59:59'),
	},
	{
		name_employee: 'Karlos Braga',
		id_employee: '312307499321786368',
		date_hiring: moment('2022-01-20 00:00:00'),
		date_firing: moment('2022-02-21 23:59:59'),
	},
	{
		name_employee: 'Bart Karmeliet',
		id_employee: '272695458722217985',
		date_hiring: moment('2022-02-20 00:00:00'),
		date_firing: moment('2022-02-28 23:59:59'),
	},
	{
		name_employee: 'Jack Kanh',
		id_employee: '218705713667637249',
		date_hiring: moment('2022-02-21 00:00:00'),
		date_firing: moment('2022-04-08 23:59:59'),
	},
	{
		name_employee: 'Tony Hubble',
		id_employee: '200195547875901440',
		date_hiring: moment('2022-03-04 00:00:00'),
		date_firing: moment('2022-04-21 23:59:59'),
	},
	{
		name_employee: 'Olle Olsson',
		id_employee: '293414299915911168',
		date_hiring: moment('2022-03-08 00:00:00'),
		date_firing: moment('2022-03-23 23:59:59'),
	},
	{
		name_employee: 'Lucas Daviau',
		id_employee: '187558575382462464',
		date_hiring: moment('2022-03-08 00:00:00'),
		date_firing: moment('2022-04-04 23:59:59'),
	},
	{
		name_employee: 'Cameron Vlanderen',
		id_employee: '472439285778219029',
		date_hiring: moment('2022-04-04 00:00:00'),
		date_firing: moment('2022-04-20 23:59:59'),
	},
	{
		name_employee: 'Derek Denis',
		id_employee: '214299132091826176',
		date_hiring: moment('2022-04-23 00:00:00'),
		date_firing: moment('2022-04-25 23:59:59'),
	},
	{
		name_employee: 'Juste Leroy',
		id_employee: '203967342386872322',
		date_hiring: moment('2022-04-27 00:00:00'),
		date_firing: moment('2022-05-08 23:59:59'),
	},
	{
		name_employee: 'Evart Praven',
		id_employee: '229301170609324033',
		date_hiring: moment('2022-05-05 00:00:00'),
		date_firing: moment('2022-05-22 23:59:59'),
	},
	{
		name_employee: 'Joop Ash',
		id_employee: '129214824738455552',
		date_hiring: moment('2022-05-21 00:00:00'),
		date_firing: moment('2022-05-23 23:59:59'),
	},
	{
		name_employee: 'Simon Bray',
		id_employee: '113996680331788290',
		date_hiring: moment('2021-06-28 00:00:00'),
		date_firing: moment('2021-08-18 23:59:59'),
	},
	{
		name_employee: 'Samuel Slatter',
		id_employee: '148658942405246976',
		date_hiring: moment('2021-06-27 00:00:00'),
		date_firing: moment('2021-09-27 23:59:59'),
	},
	{
		name_employee: 'Ada Jaxon',
		id_employee: '194122415264104449',
		date_hiring: moment('2021-04-15 00:00:00'),
		date_firing: moment('2021-07-21 23:59:59'),
	},
	{
		name_employee: 'Safia Naly',
		id_employee: '212626097572020224',
		date_hiring: moment('2021-09-20 00:00:00'),
		date_firing: moment('2021-11-04 23:59:59'),
	},
	{
		name_employee: 'Cléo Juste',
		id_employee: '216552679290175488',
		date_hiring: moment('2021-06-24 00:00:00'),
		date_firing: moment('2021-07-21 23:59:59'),
	},
	{
		name_employee: 'Jack Sin',
		id_employee: '263379978698096641',
		date_hiring: moment('2021-08-11 00:00:00'),
		date_firing: moment('2022-01-09 23:59:59'),
	},
	{
		name_employee: 'Weston Davis',
		id_employee: '286888544939802625',
		date_hiring: moment('2021-06-03 00:00:00'),
		date_firing: moment('2021-08-15 23:59:59'),
	},
	{
		name_employee: 'Erik Marlo',
		id_employee: '291288832777912330',
		date_hiring: moment('2021-11-23 00:00:00'),
		date_firing: moment('2021-12-01 23:59:59'),
	},
	{
		name_employee: 'Yui Rivers',
		id_employee: '306888420616044544',
		date_hiring: moment('2021-12-11 00:00:00'),
		date_firing: moment('2022-01-02 23:59:59'),
	},
	{
		name_employee: 'Matteo Nofuentes Giuliani',
		id_employee: '316312841743499275',
		date_hiring: moment('2021-05-14 00:00:00'),
		date_firing: moment('2021-09-21 23:59:59'),
	},
	{
		name_employee: 'Jack Bartowski',
		id_employee: '317184577615691776',
		date_hiring: moment('2021-09-05 00:00:00'),
		date_firing: moment('2021-10-11 23:59:59'),
	},
	{
		name_employee: 'Léon Carpentier',
		id_employee: '342379490720088066',
		date_hiring: moment('2021-09-04 00:00:00'),
		date_firing: moment('2021-12-03 23:59:59'),
	},
	{
		name_employee: 'Alexe Boulianne',
		id_employee: '352512277229993985',
		date_hiring: moment('2021-11-04 00:00:00'),
		date_firing: moment('2021-12-11 23:59:59'),
	},
	{
		name_employee: 'Jack Sterne',
		id_employee: '372025773932150786',
		date_hiring: moment('2021-09-01 00:00:00'),
		date_firing: moment('2021-09-30 23:59:59'),
	},
	{
		name_employee: 'Avery Hudson',
		id_employee: '443840845586759690',
		date_hiring: moment('2021-07-06 00:00:00'),
		date_firing: moment('2021-08-16 23:59:59'),
	},
	{
		name_employee: 'Max Arrington',
		id_employee: '519990505367666728',
		date_hiring: moment('2020-10-22 00:00:00'),
		date_firing: moment('2021-10-12 23:59:59'),
	},
	{
		name_employee: 'Thomas Lopez',
		id_employee: '545006061539819531',
		date_hiring: moment('2021-11-03 00:00:00'),
		date_firing: moment('2021-12-16 23:59:59'),
	},
	{
		name_employee: 'Poppy Blackwood',
		id_employee: '587037335997382697',
		date_hiring: moment('2021-08-19 00:00:00'),
		date_firing: moment('2021-10-05 23:59:59'),
	},
	{
		name_employee: 'Jack Corlont',
		id_employee: '876469120118444073',
		date_hiring: moment('2021-08-16 00:00:00'),
		date_firing: moment('2021-10-06 23:59:59'),
	},
	{
		name_employee: 'Jane Wilcox',
		id_employee: '894462485644574730',
		date_hiring: moment('2021-11-30 00:00:00'),
		date_firing: moment('2021-12-30 23:59:59'),
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
				date_hiring: moment('2022-01-17 00:00:00'),
			},
			{
				where: {
					id_employee: '298415959436165120',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-01-25 00:00:00'),
			},
			{
				where: {
					id_employee: '174954895529476096',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-02-18 00:00:00'),
			},
			{
				where: {
					id_employee: '400354507294244874',
				},
			},
		);
		await Employee.update(
			{
				date_hiring: moment('2022-02-19 00:00:00'),
			},
			{
				where: {
					id_employee: '155366649019498506',
				},
			},
		);
		await Grossiste.update(
			{
				id_employe: '4',
			},
			{
				where: {
					id: 4675,
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
