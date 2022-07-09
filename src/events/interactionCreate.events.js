const { Op } = require('sequelize');
const { Enterprise, Product, Group } = require('../dbObjects');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) {
			if (interaction.isAutocomplete()) {
				const focusedOption = interaction.options.getFocused(true);
				if (focusedOption.name === 'nom_entreprise' || focusedOption.name === 'client') {
					const enterprises = await Enterprise.findAll({ attributes: ['name_enterprise'], order: [['name_enterprise', 'ASC']], where: { deleted: false, name_enterprise: { [Op.like]: `%${focusedOption.value}%` } }, limit: 24 });
					const choices = enterprises.map(e => ({ name: e.name_enterprise, value: e.name_enterprise }));
					if (interaction.commandName === 'facture') {
						const pattern = new RegExp(`${focusedOption.value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || 'particulier'}`);
						if (pattern.test('particulier')) {
							choices.push({ name: 'Particulier', value: 'Particulier' });
						}
					}
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_produit') {
					const products = await Product.findAll({ attributes: ['id_product', 'name_product'], order: [['name_product', 'ASC']], where: { deleted: false, name_product: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = products.map(p => ({ name: p.name_product, value: p.id_product }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_groupe') {
					const groups = await Group.findAll({ attributes: ['id_group', 'name_group'], order: [['name_group', 'ASC']], where: { name_group: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = groups.map(g => ({ name: g.name_group, value: g.id_group }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'résultat_recette' || focusedOption.name.startsWith('ingrédient')) {
					const products = await Product.findAll({ attributes: ['id_product', 'name_product'], order: [['name_product', 'ASC']], where: { deleted: false, name_product: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = products.map(p => ({ name: p.name_product, value: p.id_product }));
					await interaction.respond(choices);
				}
			}
			else if (interaction.isButton()) {
				if (interaction.customId.startsWith('stock')) {
					const command = interaction.client.commands.get('stocks');
					await command.buttonClicked(interaction);
				}
				else if (interaction.customId.startsWith('pds')) {
					const command = interaction.client.commands.get('pds');
					await command.buttonClicked(interaction);
				}
			}
			else if (interaction.isContextMenu()) {
				console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

				const command = interaction.client.commands.get(interaction.commandName);

				if (!command) return;

				try {
					await command.execute(interaction);
				}
				catch (error) {
					console.error(error);
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}

			// Les interactions sont écoutés depuis la commande.
			return;
		}

		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};
