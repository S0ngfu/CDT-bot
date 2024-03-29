const { SlashCommandBuilder, time, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Grossiste, Employee } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
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
		.setName('historique_grossiste')
		.setDescription('Permet de montrer l\'historique des tournées')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addStringOption((option) =>
			option
				.setName('filtre')
				.setDescription('Permet de choisir le format de l\'historique')
				.setRequired(false)
				.addChoices(
					{ name: 'Détail', value: 'detail' },
					{ name: 'Journée', value: 'day' },
					{ name: 'Semaine', value: 'week' },
				),
		),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
		let start = null;
		let end = null;
		let message = null;
		const admin = interaction.member.roles.cache.has(roleId);
		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.editReply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		const userId = admin ? false : employee.id;

		if (filtre === 'detail') {
			start = 0;
			end = 15;
			const data = await getData(filtre, start, end, userId);
			message = await interaction.editReply({
				embeds: await getEmbed(interaction, data, filtre, start, end, userId),
				components: [getButtons(filtre, start, end)],
				fetchReply: true,
				ephemeral: true,
			});
		}
		else if (filtre === 'day') {
			start = moment.tz('Europe/Paris').startOf('day').hours(6);
			end = moment.tz('Europe/Paris').startOf('day').add(1, 'd').hours(6);
			const data = await getData(filtre, start, end, userId);
			message = await interaction.editReply({
				embeds: await getEmbed(interaction, data, filtre, start, end, userId),
				components: [getButtons(filtre, start, end)],
				fetchReply: true,
				ephemeral: true,
			});
		}
		else if (filtre === 'week') {
			start = moment().startOf('week').hours(6);
			end = moment().startOf('week').add(7, 'd').hours(6);
			const data = await getData(filtre, start, end, userId);
			message = await interaction.editReply({
				embeds: await getEmbed(interaction, data, filtre, start, end, userId),
				components: [getButtons(filtre, start, end)],
				fetchReply: true,
				ephemeral: true,
			});
		}

		const componentCollector = message.createMessageComponentCollector({ time: 840000 });

		componentCollector.on('collect', async i => {
			await i.deferUpdate();
			if (i.customId === 'next') {
				if (filtre === 'detail') {
					start += 15;
				}
				else if (filtre === 'day') {
					start.add('1', 'd');
					end.add('1', 'd');
				}
				else if (filtre === 'week') {
					start.add('1', 'w');
					end.add('1', 'w');
				}
				await i.editReply({
					embeds: await getEmbed(interaction, await getData(filtre, start, end, userId), filtre, start, end, userId),
					components: [getButtons(filtre, start, end)],
				});
			}
			else if (i.customId === 'previous') {
				if (filtre === 'detail') {
					start -= 15;
				}
				else if (filtre === 'day') {
					start.subtract('1', 'd');
					end.subtract('1', 'd');
				}
				else if (filtre === 'week') {
					start.subtract('1', 'w');
					end.subtract('1', 'w');
				}
				await i.editReply({
					embeds: await getEmbed(interaction, await getData(filtre, start, end, userId), filtre, start, end, userId),
					components: [getButtons(filtre, start, end)],
				});
			}
		});

		componentCollector.on('end', () => {
			interaction.editReply({ components: [] });
		});
	},
};

const getData = async (filtre, start, end, userId) => {
	const where = new Object();
	if (userId) {
		where.id_employe = userId;
	}

	if (filtre === 'detail') {
		return await Grossiste.findAll({
			attributes: [
				'id',
				'id_employe',
				'quantite',
				'timestamp',
			],
			where: where,
			include: [{ model: Employee }],
			order: [['timestamp', 'DESC']],
			offset: start,
			limit: end,
		});
	}

	where.timestamp = { [Op.between]: [+start, +end] };

	return await Grossiste.findAll({
		attributes: [
			'id_employe',
			[fn('sum', col('quantite')), 'total'],
		],
		where: where,
		include: [{ model: Employee }],
		group: ['id_employe'],
		raw: true,
	});
};

const getButtons = (filtre, start, end) => {
	if (filtre !== 'detail') {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
		]);
	}
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
	]);
};

const getEmbed = async (interaction, data, filtre, start, end, userId) => {
	let sum = 0;
	let embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Bouteilles déclarées')
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (filtre !== 'detail') {
		embed.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));
	}

	if (data && data.length > 0) {
		if (filtre !== 'detail') {
			const arrayEmbed = [];
			const employees = new Array();
			for (const d of data) {
				sum += d.total;
				employees.push({ name: d['employee.name_employee'], bouteilles: d.total });
			}

			employees.sort((a, b) => {
				return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
			});

			employees.forEach((e, i) => {
				embed.addFields({ name: e.name, value: `${e.name} a déclaré ${e.bouteilles.toLocaleString('fr')} bouteilles (${(e.bouteilles / 720).toFixed(2)} tournées)` });
				if (i % 25 === 24) {
					arrayEmbed.push(embed);
					embed = new EmbedBuilder()
						.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
						.setTitle('Bouteilles déclarées')
						.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()))
						.setColor('#18913E')
						.setTimestamp(new Date());
				}
			});

			if (!userId) {
				embed.addFields({ name: 'Total', value: `${sum.toLocaleString('fr')} bouteilles vendues (${(sum / 720).toFixed(2)} tournées) ($${(sum * 2).toLocaleString('en')})` });
				arrayEmbed.push(embed);
			}
			else if (employees.length % 25 !== 0) {
				arrayEmbed.push(embed);
			}

			return arrayEmbed;
		}
		else {
			for (const d of data) {
				embed.addFields({ name: d.employee.name_employee, value: (userId ? '' : (d.id + ': ')) + d.quantite + ' bouteilles vendues le ' + time(d.timestamp, 'F'), inline: false });
			}
		}
	}

	return [embed];
};
