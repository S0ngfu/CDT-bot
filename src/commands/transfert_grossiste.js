const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { Employee, TransfertGrossiste } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');
const { Op } = require('sequelize');
dotenv.config();

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;
const direction_roleId = process.env.DIRECTION_ROLE_ID;
const gerant_roleId = process.env.GERANT_ROLE_ID;
const cadre_roleId = process.env.CADRE_ROLE_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('transfert_grossiste')
		.setDescription('Permet de gérer les transferts de bouteilles vendues au grossiste')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter un transfert de bouteilles de soi-même à un autre employé')
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé à qui transférer des bouteilles')
						.setRequired(true)
						.setAutocomplete(true),
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
			const employee_name_receiver = interaction.options.getString('nom_employé');
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

			const existing_receiver = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${employee_name_receiver}%` },
					date_firing: null,
				},
			});

			if (!existing_receiver) {
				return await interaction.reply({ content: `${employee_name_receiver} n'est pas employé chez nous`, ephemeral: true });
			}

			if (employee_giver === existing_receiver.id_employee) {
				return await interaction.reply({ content: 'Vous ne pouvez pas transférez des bouteilles à vous même', ephemeral: true });
			}

			await TransfertGrossiste.upsert({
				id_employe_giver: existing_giver.id_employee,
				id_employe_receiver: existing_receiver.id_employee,
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
			const admin = interaction.member.roles.cache.hasAny(direction_roleId, gerant_roleId, cadre_roleId);
			const userId = admin ? false : interaction.user.id;

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
			const admin = interaction.member.roles.cache.hasAny(direction_roleId, gerant_roleId, cadre_roleId);

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

			if (!admin && existing_transfert.id_employe_giver !== interaction.user.id) {
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
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: 'PRIMARY' }),
		new MessageButton({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: 'PRIMARY' }),
		new MessageButton({ customId: 'next', label: 'Suivant', style: 'PRIMARY' }),
	]);
};

const getData = async (start, end, userId) => {
	const where = new Object();
	if (userId) {
		where.id_employe_giver = userId;
	}

	return await TransfertGrossiste.findAll({
		where: where,
		order: [['timestamp', 'DESC']],
		offset: start,
		limit: end,
		raw: true,
	});
};

const getEmbed = async (interaction, data, userId) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Transferts enregistrés')
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (data && data.length > 0) {
		for (const d of data) {
			let user_receiver = null;
			let user_giver = null;
			if (!userId) {
				try {
					user_giver = await guild.members.fetch(d.id_employe_giver);
				}
				catch (error) {
					console.error('ERR - historique_transfert_grossiste: ', error);
				}
			}
			try {
				user_receiver = await guild.members.fetch(d.id_employe_receiver);
			}
			catch (error) {
				console.error('ERR - historique_transfert_grossiste: ', error);
			}
			const name_receiver = user_receiver ? user_receiver.nickname ? user_receiver.nickname : user_receiver.user.username : d.id_employe_receiver;
			const name_giver = user_giver ? user_giver.nickname ? user_giver.nickname : user_giver.user.username : d.id_employe_giver;
			if (d.error) {
				embed.addField(`${d.id} ${userId ? '' : `: ${name_giver}`}`, `❌ Le Transfert de ${d.quantite} bouteilles pour ${name_receiver} ne s'est pas effectué`, false);
			}
			else if (d.done) {
				embed.addField(`${d.id} ${userId ? '' : `: ${name_giver}`}`, `✅ Le transfert de ${d.quantite} bouteilles pour ${name_receiver} a bien été effectué`, false);
			}
			else {
				embed.addField(`${d.id} ${userId ? '' : `: ${name_giver}`}`, `Transfert en attente de ${d.quantite} bouteilles pour ${name_receiver}, enregistré le ${time(moment(d.timestamp, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}`, false);
			}
		}
	}

	return [embed];
};
