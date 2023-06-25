const express = require('express');
const router = express.Router();
const { Product, Group, Stock } = require('../../src/dbObjects');
const { updateStockMessage } = require('../../src/commands/stocks');

const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

router.get('/', async (req, res) => {
	const show_deleted = req.query?.deleted !== '0' ? '1' : '0';
	const show_no_group = req.query?.no_group !== '0' ? '1' : '0';
	const whereCondition = {};

	if (show_deleted !== '1') {
		whereCondition.deleted = false;
	}

	if (show_no_group === '1') {
		whereCondition.id_group = null;
	}

	const products = await Product.findAll({
		where: whereCondition,
		order: [['id_group', 'ASC'], ['name_product', 'ASC']],
		include: [{ model: Group }],
	});
	res.json({ products: products });
});

router.get('/:productId(\\d+)', async (req, res) => {
	const product = await Product.findByPk(req.params.productId, { include: [{ model: Group }] });
	if (product) {
		res.json({ product: product });
	}
	else {
		res.status(404).json({ error: 'Product not found' });
	}
});

router.patch('/:productId(\\d+)', async (req, res) => {
	const product = await Product.findByPk(req.params.productId);

	if (!product) {
		return res.status(404).json({ error: 'Product not found' });
	}

	if (req.body.emoji_product && !req.body.emoji_product.match(emoji_custom_regex) && !req.body.emoji_product.match(emoji_unicode_regex)) {
		req.body.emoji_product = null;
	}

	await product.update({
		name_product: req.body.name_product,
		emoji_product: req.body.emoji_product,
		default_price: req.body.default_price,
		id_group: req.body.id_group,
		is_available: req.body.is_available ? true : false,
		qt_wanted: req.body.qt_wanted || null,
		calculo_check: req.body.calculo_check ? true : false,
	});

	const stock = await Stock.findOne({
		where: { id_message: product.id_message },
	});

	if (stock) {
		await updateStockMessage(req.app.myClient, stock);
	}

	res.status(204).json();
});

router.patch('/move/:productId(\\d+)', async (req, res) => {
	const product = await Product.findByPk(req.params.productId);

	if (!product) {
		return res.status(404).json({ error: 'Product not found' });
	}

	await product.update({
		id_group: req.body.id_group,
	});

	const stock = await Stock.findOne({
		where: { id_message: product.id_message },
	});

	if (stock) {
		await updateStockMessage(req.app.myClient, stock);
	}

	res.status(204).json();
});

router.patch('/delete/:productId(\\d+)', async (req, res) => {
	const product = await Product.findOne({ where: { deleted: false, id_product: req.params.productId } });

	if (!product) {
		res.status(404).json({ error: 'Product not found' });
	}

	const stock = await Stock.findOne({
		where: { id_message: product.id_message },
	});

	await product.update({ deleted: true, id_message: null });

	if (stock) {
		await updateStockMessage(req.app.myClient, stock);
	}

	res.status(204).json();
});

module.exports = router;
