const express = require('express');
const router = express.Router();
const { Product, Group } = require('../../src/dbObjects');
const { Op } = require('sequelize');

const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
const emoji_unicode_regex = '^[\u0030-\uFFFF]+$';

router.get('/', async (req, res) => {
	const show_deleted = req.query?.deletedProduct !== '0' ? '1' : '0';

	let groups = null;
	if (show_deleted === '1') {
		groups = await Group.findAll({
			order: [['name_group', 'ASC'], [{ model: Product }, 'name_product', 'ASC' ]],
			include: [{ model: Product, required: false }],
		});
	}
	else {
		groups = await Group.findAll({
			order: [['name_group', 'ASC'], [{ model: Product }, 'name_product', 'ASC' ]],
			include: [{ model: Product, required: false, where: { deleted: false } }],
		});
	}
	res.json({ groups: groups });
});

router.get('/:groupId(\\d+)', async (req, res) => {
	const group = await Group.findByPk(req.params.groupId, { include: [{ model: Product, order: [['name_product', 'ASC']] }] });
	if (group) {
		res.json({ group: group });
	}
	else {
		res.status(404).json({ error: 'Group not found' });
	}
});

router.patch('/:groupId(\\d+)', async (req, res) => {
	const group = await Group.findByPk(req.params.groupId, { include: [{ model: Product }] });

	if (!group) {
		res.status(404).json({ error: 'Group not found' });
	}

	if (req.body.default_group) {
		await Group.update({ default_group: false }, { where: { id_group: { [Op.ne]: req.params.groupId } } });
	}

	if (req.body.emoji_group && !req.body.emoji_group.match(emoji_custom_regex) && !req.body.emoji_group.match(emoji_unicode_regex)) {
		req.body.emoji_group = null;
	}

	await group.update({
		name_group: req.body.name_group,
		emoji_group: req.body.emoji_group,
		default_group: req.body.default_group ? true : false,
	});
	res.status(204).json({});
});

router.patch('/delete/:groupId(\\d+)', async (req, res) => {
	const group = await Group.findByPk(req.params.groupId);

	if (!group) {
		return res.status(404).json({ error: 'Group not found' });
	}

	await Product.update({ id_group: null }, { where: { id_group: group.id_group } });
	await Group.destroy({ where: { id_group: group.id_group } });

	res.status(204).json({});
});

module.exports = router;
