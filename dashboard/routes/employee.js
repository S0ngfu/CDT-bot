const express = require('express');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const router = express.Router();
const { Employee, OpStock, Grossiste, Bill, BillModel } = require('../../src/dbObjects');
const { updateFicheEmploye, fireEmployee } = require ('../../src/commands/employee');

moment.tz.setDefault('Europe/Paris');
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

router.get('/', async (req, res) => {
	const show_fired = req.query?.fired !== '0' ? '1' : '0';

	let employees = null;
	if (show_fired === '1') {
		employees = await Employee.findAll({ attributes: { exclude: ['access_id', 'access_token', 'refresh_token', 'token_expires_in'] }, order: [['date_firing', 'ASC'], ['name_employee', 'ASC']] });
	}
	else {
		employees = await Employee.findAll({ attributes: { exclude: ['access_id', 'access_token', 'refresh_token', 'token_expires_in'] }, where: { date_firing: null}, order: [['name_employee', 'ASC']] });
	}

	const data = [];

	for (const e of employees) {
		data.push({
			employee: e,
			grossiste: [
				await getGrossiste(e.id, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getGrossiste(e.id, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getGrossiste(e.id, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getGrossiste(e.id, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
			nb_livraison: [
				await getNbDelivery(e.id, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getNbDelivery(e.id, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getNbDelivery(e.id, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getNbDelivery(e.id, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
			nb_stock: [
				await getNbStock(e.id, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getNbStock(e.id, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getNbStock(e.id, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getNbStock(e.id, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
		});
	}
	res.json({ employees: data });
});

router.get('/:employeeId(\\d+)', async (req, res) => {
	const employee = await Employee.findByPk(req.params.employeeId, { attributes: { exclude: ['access_id', 'access_token', 'refresh_token', 'token_expires_in'] } });
	if (employee) {
		res.json({ employee: employee });
	}
	else {
		res.status(404).json({ error: 'Employee not found' });
	}
});

router.patch('/:employeeId(\\d+)', async (req, res) => {
	const employee = await Employee.findByPk(req.params.employeeId, { attributes: { exclude: ['access_id', 'access_token', 'refresh_token', 'token_expires_in'] } });

	if (employee) {
		await employee.update({
			name_employee: req.body.name_employee,
			wage: req.body.wage,
			phone_number: req.body.phone_number,
			driving_licence: req.body.driving_licence ? true : false,
			diploma: req.body.diploma ? true : false,
			date_hiring: req.body.date_hiring || null,
			date_cdd: req.body.date_cdd || null,
			date_cdi: req.body.date_cdi || null,
			date_medical_checkup: req.body.date_medical_checkup || null,
		});

		await updateFicheEmploye(req.app.myClient, employee.id_employee);
		res.status(204).json();
	}
	else {
		res.status(404).json({ error: 'Employee not found' });
	}
});

router.patch('/fire/:employeeId(\\d+)', async (req, res) => {
	const employee = await Employee.findOne({
		where: {
			id: req.params.employeeId,
			date_firing: null,
		},
	});

	if (!employee) {
		return res.status(404).json({ error: 'Employee not found' });
	}

	await BillModel.destroy({ where: { id: req.params.employeeId } });

	const message = await fireEmployee(req.app.myClient, employee.id_employee);

	res.status(200).json({ mesg: message });
});

module.exports = router;

const getGrossiste = async (id, start, end) => {
	const data = await Grossiste.findAll({
		attributes: [
			[fn('sum', col('quantite')), 'total'],
		],
		where: {
			id_employe: id,
			timestamp: {
				[Op.between]: [+start, +end],
			},
		},
		group: ['id_employe'],
		raw: true,
	});
	return data.length === 1 ? data[0].total : 0;
};

const getNbDelivery = async (id, start, end) => {
	const data = await Bill.findAll({
		attributes: [
			[fn('count', col('id_bill')), 'nb_livraison'],
		],
		where: {
			id_employe: id,
			date_bill: {
				[Op.between]: [+start, +end],
			},
			url: { [Op.not]: null },
		},
		group: ['id_employe'],
		raw: true,
	});
	return data.length === 1 ? data[0].nb_livraison : 0;
};

const getNbStock = async (id, start, end) => {
	const data = await OpStock.findAll({
		attributes: [
			[fn('sum', col('qt')), 'qt_stock'],
		],
		where: {
			id_employe: id,
			timestamp: { [Op.between]: [+start, +end] },
			qt: { [Op.gt]: 0 },
		},
		group: ['id_employe'],
		raw: true,
	});
	return data.length === 1 ? data[0].qt_stock : 0;
};
