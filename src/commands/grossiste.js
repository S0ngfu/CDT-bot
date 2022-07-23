const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { Grossiste } = require('../dbObjects.js');
const { updateFicheEmploye } = require('./employee.js');

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('export')
		.setDescription('Permet d\'enregistrer les ventes de farines effectuées à l\'export')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nombre de farines vendues')
				.setRequired(true)
				.setMinValue(1),
		),
	async execute(interaction) {
		const quantite = interaction.options.getInteger('quantite');

		if (quantite > 0) {
			await Grossiste.upsert({
				id_employe: interaction.user.id,
				quantite: quantite,
				timestamp: moment.tz('Europe/Paris'),
			});

			await updateFicheEmploye(interaction.client, interaction.user.id);

			return interaction.reply({ content: 'Vos ' + quantite + ' farines ont bien été enregistrées', ephemeral: true });
		}
		else {
			return interaction.reply({ content: 'Vous devez renseigner un nombre positif supérieur à 0', ephemeral: true });
		}
	},
	async buttonClicked(interaction) {
		const messageFilter = m => {return m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(Number(m.content)) == m.content && parseInt(Number(m.content)) >= 0;};
		const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 120000 });

		messageCollector.on('collect', async m => {
			if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
				try {
					await m.delete();
				}
				catch (error) {
					console.error(error);
				}
			}
			await Grossiste.upsert({
				id_employe: interaction.user.id,
				quantite: parseInt(Number(m.content)),
				timestamp: moment.tz('Europe/Paris'),
			});
			messageCollector.stop();
		});

		const ask = await interaction.reply({
			content: 'Veuillez saisir le nombre de farines vendues à l\'export',
			fetchReply: true,
		});

		messageCollector.on('end', async (collected) => {
			await ask.delete();
			if (collected.size === 0) {
				const reply = await interaction.followUp({ content: 'Temps d\'attente dépassé', fetchReply: true });
				await new Promise(r => setTimeout(r, 5000));
				await reply.delete();
				return;
			}
			else {
				await updateFicheEmploye(interaction.client, interaction.user.id);
				const quantity = parseInt(collected.values().next().value.content);
				if (quantity !== 0) {
					const reply = await interaction.followUp({ content: `Vos ${quantity} farines ont bien été enregistrées`, fetchReply: true });
					await new Promise(r => setTimeout(r, 5000));
					await reply.delete();
				}
			}
		});
	},
};