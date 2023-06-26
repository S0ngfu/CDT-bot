const express = require('express');
const router = express.Router();
const { Vehicle } = require('../../src/dbObjects');
const { updatePDS } = require ('../../src/commands/pds');

const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
const emoji_unicode_regex = '^[\u0030-\uFFFF]+$';

router.get('/', async (req, res) => {
	const vehicles = await Vehicle.findAll({ order: [['order', 'ASC'], ['name_vehicle', 'ASC']] });
	res.json({ vehicles: vehicles });
});

router.get('/:vehicleId(\\d+)', async (req, res) => {
	const vehicle = await Vehicle.findByPk(req.params.vehicleId);
	if (vehicle) {
		res.json({ vehicle: vehicle });
	}
	else {
		res.status(404).json({ error: 'Vehicle not found' });
	}
});

router.patch('/:vehicleId(\\d+)', async (req, res) => {
	const vehicle = await Vehicle.findByPk(req.params.vehicleId);

	if (!vehicle) {
		return res.status(404).json({ error: 'Vehicle not found' });
	}

	if (req.body.emoji_vehicle && !req.body.emoji_vehicle.match(emoji_custom_regex) && !req.body.emoji_vehicle.match(emoji_unicode_regex)) {
		req.body.emoji_vehicle = null;
	}

	await vehicle.update({
		name_vehicle: req.body.name_vehicle,
		emoji_vehicle: req.body.emoji_vehicle,
		color_vehicle: req.body.color_vehicle,
		nb_place_vehicle: req.body.nb_place_vehicle,
		available: req.body.available_reason === 'Oui' ? true : false,
		available_reason: req.body.available_reason !== 'custom' ? req.body.available_reason : req.body.custom_reason,
		to_repair: req.body.to_repair ? true : false,
		order: req.body.order,
	});

	await updatePDS(req.app.myClient);

	res.status(204).json({});
});

router.patch('/delete/:vehicleId(\\d+)', async (req, res) => {
	const vehicle = await Vehicle.findByPk(req.params.vehicleId);

	if (!vehicle) {
		return res.status(404).json({ error: 'Vehicle not found' });
	}

	await vehicle.destroy();
	await updatePDS(req.app.myClient);

	res.status(204).json({});
});

module.exports = router;
