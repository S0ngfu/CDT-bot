const { SlashCommandBuilder } = require('@discordjs/builders');
const { BillModel, Employee } = require('../dbObjects');
const { updateFicheEmploye } = require('./employee');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('modèles')
		.setDescription('Permet de gérer des modèles de calcublé')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'enregistrer un nouveau modèle')
				.addStringOption((option) =>
					option
						.setName('nom_modèle')
						.setDescription('nom à utiliser pour le modèle')
						.setRequired(true),
				).addStringOption((option) =>
					option
						.setName('emoji_modèle')
						.setDescription('emoji à utiliser pour le modèle')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Permet de supprimer un modèle enregistré')
				.addStringOption((option) =>
					option
						.setName('nom_modèle')
						.setDescription('Nom du modèle à supprimer')
						.setRequired(true)
						.setAutocomplete(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const model_name = interaction.options.getString('nom_modèle').slice(0, 80);
			const model_emoji = interaction.options.getString('emoji_modèle');
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';


			const employee = await Employee.count({ where: { id_employee: interaction.user.id, date_firing: null } });

			if (!employee) {
				return interaction.reply({ content: 'Vous ne pouvez pas avoir de modèle de facture sans être employé chez nous', ephemeral: true });
			}

			const nb_model = await BillModel.count({ where: { id_employe: interaction.user.id } });

			if (nb_model === 15) {
				return interaction.reply({ content: 'Vous ne pouvez pas avoir plus de 15 modèles de facture', ephemeral: true });
			}

			const existing_model = await BillModel.findOne({ where: { name: model_name, id_employe: interaction.user.id } });

			if (existing_model) {
				return interaction.reply({ content: `Vous avez déjà un modèle de facture portant le nom ${model_name}`, ephemeral: true });
			}

			if (model_emoji && !model_emoji.match(emoji_custom_regex) && !model_emoji.match(emoji_unicode_regex)) {
				return interaction.reply({ content: `L'emoji ${model_emoji} donné en paramètre est incorrect`, ephemeral: true });
			}

			const command = interaction.client.commands.get('calcublé');
			await command.execute(interaction, 0, model_name, model_emoji);
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const model_name = interaction.options.getString('nom_modèle');

			const existing_model = await BillModel.findOne({ where: { name: model_name, id_employe: interaction.user.id } });

			if (existing_model) {
				await existing_model.destroy();
				await updateFicheEmploye(interaction.client, interaction.user.id);
				return interaction.reply({ content: `Le modèle de facture portant le nom ${model_name} ${existing_model.emoji ? existing_model.emoji : ''} a bien été supprimé`, ephemeral: true });
			}
			else {
				return interaction.reply({ content: `Aucun modèle de facture portant le nom ${model_name} a été trouvé`, ephemeral: true });
			}
		}
	},
};