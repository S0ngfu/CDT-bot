const { SlashCommandBuilder } = require('discord.js');
const moment = require('moment');
const { Grossiste, Employee } = require('../dbObjects.js');
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

		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		if (quantite > 0) {
			await Grossiste.upsert({
				id_employe: employee.id,
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

		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		messageCollector.on('collect', async m => {
			if (interaction.guild.members.me.permissionsIn(m.channelId).has('ManageMessages')) {
				try {
					await m.delete();
				}
				catch (error) {
					console.error(error);
				}
			}
			await Grossiste.upsert({
				id_employe: employee.id,
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