const { InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { Enterprise, Product, Group, Employee, BillModel, Vehicle } = require('../dbObjects');
const { Op, col } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();
const channelId = process.env.CHANNEL_SUGGESION_ID;

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (interaction.type !== InteractionType.ApplicationCommand) {
			if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
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
				else if (focusedOption.name === 'nom_employé') {
					const where = new Object();
					where.name_employee = { [Op.like]: `%${focusedOption.value}%` };
					where.date_firing = null;
					if (interaction.commandName === 'transfert_grossiste' || interaction.commandName === 'pds') {
						where.id_employee = { [Op.not]: interaction.user.id };
					}
					const employees = await Employee.findAll({ attributes: ['name_employee'], order: [['name_employee', 'ASC']], where: where, limit: 25 });
					const choices = employees.map(e => ({ name: e.name_employee, value: e.name_employee }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_modèle') {
					if (interaction.commandName === 'employés') {
						const bill_models = await BillModel.findAll({
							order: [[col('bill_model.name'), 'ASC']],
							where: { name: { [Op.like]: `%${focusedOption.value}%` } },
							include: [{ model: Employee }],
							limit: 25,
						});
						const choices = bill_models.map(bm => {
							return ({ name: `${bm.name} - ${bm.employee.name_employee}`, value: `${bm.name}` });
						});
						await interaction.respond(choices);
					}
					else {
						const bill_models = await BillModel.findAll({ attributes: ['name'], order: [['name', 'ASC']], where: { id_employe: interaction.user.id, name: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
						const choices = bill_models.map(bm => ({ name: bm.name, value: bm.name }));
						await interaction.respond(choices);
					}
				}
				else if (focusedOption.name === 'résultat_recette' || focusedOption.name.startsWith('ingrédient')) {
					const products = await Product.findAll({ attributes: ['id_product', 'name_product'], order: [['name_product', 'ASC']], where: { deleted: false, name_product: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = products.map(p => ({ name: p.name_product, value: p.id_product }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'véhicule') {
					const vehicles = await Vehicle.findAll({ attributes: ['id_vehicle', 'name_vehicle'], order: [['name_vehicle', 'ASC']], where: { name_vehicle: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = vehicles.map(v => ({ name: v.name_vehicle, value: v.id_vehicle }));
					await interaction.respond(choices);
				}
			}
			else if (interaction.type === InteractionType.MessageComponent) {
				if (interaction.customId.startsWith('stock')) {
					const command = interaction.client.commands.get('stocks');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button stocks.`);
				}
				else if (interaction.customId.startsWith('pds')) {
					const command = interaction.client.commands.get('pds');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button pds.`);
				}
				else if (interaction.customId.startsWith('export')) {
					const command = interaction.client.commands.get('export');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button export.`);
				}
				else if (interaction.customId.includes('calcuble')) {
					const command = interaction.client.commands.get('calcublé');
					await command.execute(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button calcublé.`);
				}
				else if (interaction.customId.startsWith('model')) {
					const command = interaction.client.commands.get('calcublé');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button model.`);
				}
				else if (interaction.customId.includes('suggestionBoxButton')) {
					const modal = new ModalBuilder()
						.setCustomId('suggestionBox')
						.setTitle('Boîte à idées');
					const title = new TextInputBuilder()
						.setCustomId('suggestionBoxTitle')
						.setLabel('Sujet de la demande (Idée/Soucis/Autre)')
						.setStyle('Short')
						.setMaxLength(250);
					const suggestion = new TextInputBuilder()
						.setCustomId('suggestionBoxText')
						.setLabel('Demande')
						.setStyle('Paragraph');
					const firstActionRow = new ActionRowBuilder().addComponents(title);
					const secondActionRow = new ActionRowBuilder().addComponents(suggestion);
					modal.addComponents(firstActionRow, secondActionRow);
					await interaction.showModal(modal);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button boîte à idées.`);
				}
				else if (interaction.customId.startsWith('refreshEmployee')) {
					const command = interaction.client.commands.get('employés');
					await command.refreshEmployee(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button refreshEmployee.`);
				}
			}
			else if (interaction.type === InteractionType.ModalSubmit) {
				const title = interaction.fields.getTextInputValue('suggestionBoxTitle');
				const suggestion = interaction.fields.getTextInputValue('suggestionBoxText');

				const embed = new EmbedBuilder()
					.setTitle(title ? title : 'Vide')
					.setDescription(suggestion ? suggestion : 'Vide')
					.setTimestamp(new Date());

				const messageManager = await interaction.client.channels.fetch(channelId);
				await messageManager.send({ embeds: [embed] });

				await interaction.reply({ content: 'Votre message a bien été envoyé', ephemeral: true });

				console.log(`${interaction.user.tag} just send a suggestion`);
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
			if (interaction.deferred) {
				await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};
