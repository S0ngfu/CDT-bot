const { Modal, TextInputComponent, MessageActionRow, MessageEmbed } = require('discord.js');
const { Enterprise, Product, Group, Employee } = require('../dbObjects');
const { Op } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();
const channelId = process.env.CHANNEL_SUGGESION_ID;

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) {
			if (interaction.isAutocomplete()) {
				const focusedOption = interaction.options.getFocused(true);
				if (focusedOption.name === 'nom_entreprise' || focusedOption.name === 'client') {
					const enterprises = await Enterprise.findAll({ attributes: ['name_enterprise'], where: { deleted: false, name_enterprise: { [Op.like]: `%${focusedOption.value}%` } }, limit: 24 });
					const choices = enterprises.map(e => ({ name: e.name_enterprise, value: e.name_enterprise }));
					if (interaction.commandName === 'facture') {
						const pattern = new RegExp(`${focusedOption.value.toLowerCase() || 'particulier'}`);
						if (pattern.test('particulier')) {
							choices.push({ name: 'Particulier', value: 'Particulier' });
						}
					}
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_produit') {
					const products = await Product.findAll({ attributes: ['name_product'], where: { deleted: false, name_product: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = products.map(p => ({ name: p.name_product, value: p.name_product }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_groupe') {
					const groups = await Group.findAll({ attributes: ['name_group'], where: { name_group: { [Op.like]: `%${focusedOption.value}%` } }, limit: 25 });
					const choices = groups.map(g => ({ name: g.name_group, value: g.name_group }));
					await interaction.respond(choices);
				}
				else if (focusedOption.name === 'nom_employé') {
					const employees = await Employee.findAll({ attributes: ['name_employee'], where: { name_employee: { [Op.like]: `%${focusedOption.value}%` }, date_firing: null }, limit: 25 });
					const choices = employees.map(e => ({ name: e.name_employee, value: e.name_employee }));
					await interaction.respond(choices);
				}
			}
			else if (interaction.isButton()) {
				if (interaction.customId.startsWith('calculo')) {
					const command = interaction.client.commands.get('calculo');
					await command.execute(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button calculo.`);
				}
				else if (interaction.customId.startsWith('pds')) {
					const command = interaction.client.commands.get('pds');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button pds.`);
				}
				else if (interaction.customId.startsWith('stock')) {
					const command = interaction.client.commands.get('stocks');
					await command.buttonClicked(interaction);
					console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered button stocks.`);
				}
				else if (interaction.customId.includes('suggestionBoxButton')) {
					const modal = new Modal()
						.setCustomId('suggestionBox')
						.setTitle('Boîte à idées');
					const title = new TextInputComponent()
						.setCustomId('suggestionBoxTitle')
						.setLabel('Sujet de la demande (Idée/Soucis/Autre)')
						.setStyle('SHORT')
						.setMaxLength(250);
					const suggestion = new TextInputComponent()
						.setCustomId('suggestionBoxText')
						.setLabel('Demande')
						.setStyle('PARAGRAPH');
					const firstActionRow = new MessageActionRow().addComponents(title);
					const secondActionRow = new MessageActionRow().addComponents(suggestion);
					modal.addComponents(firstActionRow, secondActionRow);
					await interaction.showModal(modal);
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
			else if (interaction.isModalSubmit()) {
				const title = interaction.fields.getTextInputValue('suggestionBoxTitle');
				const suggestion = interaction.fields.getTextInputValue('suggestionBoxText');

				const embed = new MessageEmbed()
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
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};