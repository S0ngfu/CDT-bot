const express = require('express');
const router = express.Router();
const { Bill } = require('../../src/dbObjects');


router.get('/', async (req, res) => {
	console.log(req.query);
	// TODO : user req.query to pass parameters (enterprise, day, week, product detail, page, limit, ...)
	const page = (req.query?.page || 1) - 1;
	const limit = (req.query?.limit || 15);
	const bills = await Bill.findAll({ order: [['date_bill', 'DESC']], offset: page * 15, limit: limit });
	res.json({ bills: bills });
});

module.exports = router;
