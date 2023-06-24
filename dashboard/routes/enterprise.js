const express = require('express');
const router = express.Router();
const { Enterprise, PriceEnterprise, Product, Tab } = require('../../src/dbObjects');
const { updateArdoiseMessage } = require ('../../src/commands/tab');

const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

router.get('/', async (req, res) => {
	const show_deleted = req.query?.deleted !== '0' ? '1' : '0';

	let enterprises = null;
	if (show_deleted === '1') {
		enterprises = await Enterprise.findAll({ order: [['deleted', 'ASC'], ['name_enterprise', 'ASC']] });
	}
	else {
		enterprises = await Enterprise.findAll({ where: { deleted: false }, order: [['name_enterprise', 'ASC']] });
	}
	res.json({ enterprises: enterprises });
});

router.get('/:enterpriseId(\\d+)', async (req, res) => {
	const enterprise = await Enterprise.findByPk(req.params.enterpriseId);
	if (enterprise) {
		res.json({ enterprise: enterprise });
	}
	else {
		res.status(404).json({ error: 'Enterprise not found' });
	}
});

router.patch('/:enterpriseId(\\d+)', async (req, res) => {
	const enterprise = await Enterprise.findByPk(req.params.enterpriseId);

	if (enterprise) {
		const nb_enterprise = await Enterprise.count({ where: { show_calculo: true, deleted: false } });
		let updateTab = false;

		if (!enterprise.show_calculo && req.body.show_calculo && nb_enterprise === 24) {
			return res.status(409).json({ error: 'Modification non effectué. Il y aurait trop d\'entreprise sur la calculo' });
		}

		if (req.body.emoji_enterprise && !req.body.emoji_enterprise.match(emoji_custom_regex) && !req.body.emoji_enterprise.match(emoji_unicode_regex)) {
			req.body.emoji_enterprise = null;
		}

		if (enterprise.name_enterprise !== req.body.name_enterprise
			|| enterprise.info_ardoise !== req.body.info_ardoise
			|| enterprise.facture_max_ardoise !== req.body.facture_max_ardoise) {
			updateTab = true;
		}

		await enterprise.update({
			name_enterprise: req.body.name_enterprise,
			emoji_enterprise: req.body.emoji_enterprise,
			color_enterprise: req.body.color_enterprise,
			facture_max_ardoise: req.body.facture_max_ardoise || null,
			info_ardoise: req.body.info_ardoise,
			show_calculo: req.body.show_calculo ? true : false,
		});
		res.status(204).json();

		const tab = await Tab.findOne({
			where: { id_message: enterprise.id_message },
		});

		if (updateTab && tab) {
			await updateArdoiseMessage(req.app.myClient, tab);
		}
	}
	else {
		res.status(404).json({ error: 'Enterprise not found' });
	}
});

router.patch('/delete/:enterpriseId(\\d+)', async (req, res) => {
	const enterprise = await Enterprise.findOne({ where: { deleted: false, id_enterprise: req.params.enterpriseId } });

	if (!enterprise) {
		return res.status(404).json({ error: 'Enterprise not found' });
	}

	if (enterprise.sum_ardoise) {
		return res.status(409).json({ msg: `L'entreprise ${enterprise.name_enterprise} ne peut pas être supprimé car il reste $${enterprise.sum_ardoise.toLocaleString('en')} sur son ardoise` });
	}

	const tab = await Tab.findOne({
		where: { id_message: enterprise.id_message },
	});

	await enterprise.update({ deleted: true, id_message: null });

	if (tab) {
		await updateArdoiseMessage(req.app.myClient, tab);
	}

	res.status(204).json();
});

router.get('/prices', async (req, res) => {
	const prices = await PriceEnterprise.findAll();
	res.json({ prices: prices });
});

router.patch('/price', async (req, res) => {
	const product = await Product.findByPk(req.body.idProduct);
	if (!product) {
		res.status(404).json({ error: 'Le produit n\'existe pas' });
	}

	const enterprise = await Enterprise.findByPk(req.body.idEnterprise);
	if (!enterprise) {
		res.status(404).json({ error: 'L\'entreprise n\'existe pas' });
	}

	if (product.default_price === req.body.price) {
		await PriceEnterprise.destroy({ where: { id_enterprise: enterprise.id_enterprise, id_product: product.id_product } });
	}
	else {
		await PriceEnterprise.upsert({ id_enterprise: enterprise.id_enterprise, id_product: product.id_product, enterprise_price: req.body.price });
	}

	res.status(200).json({ msg: `Le prix du produit ${product.name_product} pour l'entreprise ${enterprise.name_enterprise} est désormais de ${req.body.price}$` });
});

module.exports = router;
