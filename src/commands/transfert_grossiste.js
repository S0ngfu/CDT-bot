const { SlashCommandBuilder, time, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Employee, TransfertGrossiste } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');
dotenv.config();

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const roleId = process.env.DIRECTION_ROLE_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('transfert_grossiste')
		.setDescription('Permet de gérer les transferts de bouteilles vendues au grossiste')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter un transfert de bouteilles de soi-même à un autre employé')
				.addUserOption((option) =>
					option
						.setName('nom')
						.setDescription('Personne sur discord')
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantite')
						.setDescription('Nombre de bouteilles à transférer')
						.setRequired(true)
						.setMinValue(1),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Permet d\'afficher l\'historique des transferts'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Permet de supprimer un transfert qui n\'a pas encore été effectué')
				.addIntegerOption((option) =>
					option
						.setName('id')
						.setDescription('Id du transfert à supprimer')
						.setRequired(true)
						.setMinValue(0),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const employee_giver = interaction.user.id;
			const employee_receiver = interaction.options.getUser('nom');
			const nb_taches = interaction.options.getInteger('quantite');

			const existing_giver = await Employee.findOne({
				where: {
					id_employee: employee_giver,
					date_firing: null,
				},
			});

			if (!existing_giver) {
				return await interaction.reply({ content: 'Vous n\'êtes pas employé chez nous', ephemeral: true });
			}

			if (employee_giver === employee_receiver.id) {
				return await interaction.reply({ content: 'Vous ne pouvez pas transférez des bouteilles à vous même', ephemeral: true });
			}

			const existing_receiver = await Employee.findOne({
				where: {
					id_employee: employee_receiver.id,
					date_firing: null,
				},
			});

			if (!existing_receiver) {
				return await interaction.reply({ content: `${employee_receiver.tag} n'est pas employé chez nous`, ephemeral: true });
			}

			await TransfertGrossiste.upsert({
				id_employe_giver: existing_giver.id,
				id_employe_receiver: existing_receiver.id,
				quantite: nb_taches,
				timestamp: moment.tz('Europe/Paris'),
			});

			return await interaction.reply({ content: `Votre souhait de transférer ${nb_taches.toLocaleString('en')} bouteilles à ${existing_receiver.name_employee} a bien été enregistré`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });
			let start = 0;
			const nb_data = 15;
			let message = null;
			const admin = interaction.member.roles.cache.has(roleId);
			const employee = await Employee.findOne({
				where: {
					id_employee: interaction.user.id,
					date_firing: null,
				},
			});
			if (!employee) {
				return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
			}
			const userId = admin ? false : employee.id;

			message = await interaction.editReply({
				embeds: await getEmbed(interaction, await getData(start, nb_data, userId), userId),
				components: [getButtons(start, nb_data)],
				fetchReply: true,
				ephemeral: true,
			});

			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			componentCollector.on('collect', async i => {
				await i.deferUpdate();
				if (i.customId === 'next') {
					start += 15;
					await i.editReply({
						embeds: await getEmbed(interaction, await getData(start, nb_data, userId), userId),
						components: [getButtons(start, nb_data)],
					});
				}
				else if (i.customId === 'previous') {
					start -= 15;
					await i.editReply({
						embeds: await getEmbed(interaction, await getData(start, nb_data, userId), userId),
						components: [getButtons(start, nb_data)],
					});
				}
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const id = interaction.options.getInteger('id');
			const admin = interaction.member.roles.cache.has(roleId);
			const employee = await Employee.findOne({
				where: {
					id_employee: interaction.user.id,
					date_firing: null,
				},
			});
			if (!employee) {
				return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
			}

			const existing_transfert = await TransfertGrossiste.findOne({
				where: {
					id: id,
				},
			});

			if (!existing_transfert) {
				return await interaction.reply({
					content: ':warning: Erreur: le souhait de transfert n\'a pas été trouvé',
					ephemeral: true,
				});
			}

			if (!admin && existing_transfert.id_employe_giver !== employee.id) {
				return await interaction.reply({
					content: 'Vous ne pouvez pas supprimer un souhait de transfert que vous n\'avez pas effectué',
					ephemeral: true,
				});
			}

			if (existing_transfert.done || existing_transfert.error) {
				return await interaction.reply({
					content: 'Suppression impossible, le souhait de transfert a déjà été traité',
					ephemeral: true,
				});
			}

			await TransfertGrossiste.destroy({ where: { id: id } });

			return await interaction.reply({
				content: 'Le souhait de transfert a été supprimé',
				ephemeral: true,
			});

		}

	},
};

const getButtons = (start, end) => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
	]);
};

const getData = async (start, end, userId) => {
	const where = new Object();
	if (userId) {
		where.id_employe_giver = userId;
	}

	return await TransfertGrossiste.findAll({
		where: where,
		include: [
			{ model: Employee, as: 'employe_giver' },
			{ model: Employee, as: 'employe_receiver' },
		],
		order: [['timestamp', 'DESC']],
		offset: start,
		limit: end,
		raw: true,
	});
};

const getEmbed = async (interaction, data, userId) => {
	const embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Transferts enregistrés')
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (data && data.length > 0) {
		for (const d of data) {
			if (d.error) {
				embed.addFields({ name: `${d.id} ${userId ? '' : `: ${d['employe_giver.name_employee']}`}`, value: `❌ Le Transfert de ${d.quantite} bouteilles pour ${d['employe_receiver.name_employee']} ne s'est pas effectué, enregistré le ${time(moment(d.timestamp, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}`, inline: false });
			}
			else if (d.done) {
				embed.addFields({ name: `${d.id} ${userId ? '' : `: ${d['employe_giver.name_employee']}`}`, value: `✅ Le transfert de ${d.quantite} bouteilles pour ${d['employe_receiver.name_employee']} a bien été effectué, enregistré le ${time(moment(d.timestamp, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}`, inline: false });
			}
			else {
				embed.addFields({ name: `${d.id} ${userId ? '' : `: ${d['employe_giver.name_employee']}`}`, value: `Transfert en attente de ${d.quantite} bouteilles pour ${d['employe_receiver.name_employee']}, enregistré le ${time(moment(d.timestamp, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}`, inline: false });
			}
		}
	}

	return [embed];
};
