const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { Grossiste } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();

const guildId = process.env.GUILD_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modif-delete_grossiste')
		.setDescription('Permet de modifier ou de supprimer une tournée')
		.setDefaultPermission(false)
		.addIntegerOption((option) =>
			option
				.setName('id')
				.setDescription('Id de la tournée')
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nouvelle quantité (0 pour supprimer)')
				.setRequired(true),
		),
	async execute(interaction) {
		const id = interaction.options.getInteger('id');
		const quantite = interaction.options.getInteger('quantite');

		if (quantite === 0) {
			const data = await Grossiste.findOne({ attributes: ['id_employe', 'quantite', 'timestamp'], where: { id: id } });
			if (data) {
				let user = null;
				const guild = await interaction.client.guilds.fetch(guildId);
				try {
					user = await guild.members.fetch(data.id_employe);
				}
				catch (error) {
					console.log('ERR - modif-delete_grossiste: ', error);
				}
				const name = user ? user.nickname ? user.nickname : user.user.username : data.id_employe;
				await Grossiste.destroy({ where: { id: id } });
				return await interaction.reply({
					content: 'La tournée de ' + name + ' pour ' + data.quantite + ' bouteilles effectuée le ' + time(moment(new Date(data.timestamp)).tz('Europe/Paris').unix(), 'F') + ' a été supprimée',
					ephemeral: true,
				});
			}
			return await interaction.reply({
				content: ':warning: Erreur: la tournée n\'a pas été retrouvée :warning:',
				ephemeral: true,
			});
		}
		else if (quantite > 0) {
			const data = await Grossiste.findOne({ attributes: ['id', 'id_employe', 'quantite', 'timestamp'], where: { id: id } });
			if (data) {
				const guild = await interaction.client.guilds.fetch(guildId);
				const user = await guild.members.fetch(data.id_employe);
				const name = user ? user.nickname ? user.nickname : user.user.username : data.id_employe;
				const [updated] = await Grossiste.upsert({
					id: id,
					quantite: quantite,
				});
				return await interaction.reply({
					content: 'La tournée de ' + name + ' pour ' + updated.quantite + ' bouteilles effectuée le ' + time(moment(new Date(data.timestamp)).tz('Europe/Paris').unix(), 'F') + ' a été modifié avec succès',
					ephemeral: true,
				});
			}
			return await interaction.reply({
				content: ':warning: Erreur: la tournée n\'a pas été retrouvée :warning:',
				ephemeral: true,
			});
		}
	},
};