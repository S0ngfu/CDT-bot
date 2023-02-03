const { SlashCommandBuilder } = require('@discordjs/builders');
const { Employee } = require('../dbObjects');
const { Op } = require('sequelize');
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');
const { MessageManager, EmbedBuilder, AttachmentBuilder } = require('discord.js');

dotenv.config();

const trombi_channel_Id = process.env.TROMBI_CHANNEL_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('trombinoscope')
		.setDescription('Gestion du trombinoscope')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajout_modif_photo')
				.setDescription('Permet d\'ajouter/modifier la photo du trombinoscope pour l\'employé')
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé à qui ajouter/modifier une photo')
						.setRequired(true)
						.setAutocomplete(true),
				).addAttachmentOption(option =>
					option
						.setName('photo')
						.setDescription('Permet d\'ajouter une photo de l\'employé')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retrait_photo')
				.setDescription('Permet de retirer une photo du trombinoscope pour l\'employé')
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé à qui retirer la photo')
						.setRequired(true)
						.setAutocomplete(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajout_modif_photo') {
			await interaction.deferReply({ ephemeral: true });

			const employee_name = interaction.options.getString('nom_employé');
			const photo = interaction.options.getAttachment('photo');
			let id_message = 0;
			let local_photo = null;

			const existing_employee = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${employee_name}%` },
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${employee_name} n'est pas employé chez nous`, ephemeral: true });
			}

			if (!photo.contentType.startsWith('image')) {
				return await interaction.editReply({ content: `Le fichier ${photo.name} envoyé n'est pas une image`, ephemeral: true });
			}
			else {
				if (existing_employee.trombi_file) {
					fs.unlink(`trombi/${existing_employee.trombi_file}`, (err) => {
						if (err) {
							console.error(err);
						}
					});
				}

				const promise = new Promise((resolve, reject) => {
					const file = fs.createWriteStream(`trombi/${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`);
					https.get(photo.url, function(response) {
						response.pipe(file);

						file.on('finish', () => {
							file.close();
							local_photo = `${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`;
							resolve();
						});

						file.on('error', (err) => {
							fs.unlink(`trombi/${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`);
							if (err) {
								console.error(err);
							}
							reject(err);
						});
					}).on('error', (err) => {
						reject(err);
					});
				});

				await promise;
			}


			const embed = trombiEmbed(existing_employee, local_photo);

			if (existing_employee.id_trombi_message) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(trombi_channel_Id));
				const message_to_update = await messageManager.fetch({ message: existing_employee.id_trombi_message });
				await message_to_update.edit({
					embeds: [embed],
					files: [new AttachmentBuilder(`trombi/${local_photo}`)],
				});
			}
			else {
				const messageManager = await interaction.client.channels.fetch(trombi_channel_Id);
				const message = await messageManager.send({
					embeds: [embed],
					files: [new AttachmentBuilder(`trombi/${local_photo}`)],
				});

				id_message = message.id;
			}

			await Employee.upsert({
				id: existing_employee.id,
				trombi_file: local_photo,
				id_trombi_message: id_message || existing_employee.id_trombi_message,
			});

			return await interaction.editReply({ content: `La photo du trombinoscope pour ${existing_employee.name_employee} a bien été mise à jour/ajouté`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'retrait_photo') {
			await interaction.deferReply({ ephemeral: true });

			const employee_name = interaction.options.getString('nom_employé');
			const existing_employee = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${employee_name}%` },
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${employee_name} n'est pas employé chez nous`, ephemeral: true });
			}

			if (!existing_employee.trombi_file) {
				return await interaction.editReply({ content: `${employee_name} n'a pas de photo sur le trombinoscope`, ephemeral: true });
			}

			fs.unlink(`trombi/${existing_employee.trombi_file}`, (err) => {
				if (err) {
					console.error(err);
				}
			});

			const messageManager = new MessageManager(await interaction.client.channels.fetch(trombi_channel_Id));
			const message_to_delete = await messageManager.fetch({ message: existing_employee.id_trombi_message });
			await message_to_delete.delete();

			await Employee.upsert({
				id: existing_employee.id,
				trombi_file: null,
				id_trombi_message: null,
			});

			return await interaction.editReply({ content: `La photo sur le trombinoscope de ${existing_employee.name_employee} a été retiré`, ephemeral: true });
		}
	},
};

const trombiEmbed = (employee, photo) => {
	return new EmbedBuilder()
		.setTimestamp(new Date())
		.setTitle(employee.name_employee)
		.setImage(`attachment://${photo}`);
};
