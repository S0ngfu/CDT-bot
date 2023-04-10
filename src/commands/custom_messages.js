const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageManager } = require('discord.js');
const { CustomMessages } = require('../dbObjects');
const moment = require('moment');
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('message_custom')
		.setDescription('Gestion des messages personnalisables')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('post')
				.setDescription('Envoi le message choisi')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom du message à envoyer')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter-modifier')
				.setDescription('Permet d\'ajouter ou modifier un message personnalisé')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom du message à ajouter ou modifier')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Permet de supprimer un message personnalisé (et le dépublie)')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom du message à supprimer')
						.setRequired(true)
						.setAutocomplete(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'post') {
			await interaction.deferReply({ ephemeral: true });
			const name = interaction.options.getString('nom');
			const existing_messages = await CustomMessages.findAll({ where: { name: name } });

			if (existing_messages.length === 0) {
				return await interaction.editReply({ content: `${name} ne correspond à aucun message existant`, ephemeral: true });
			}

			await interaction.editReply({ content: `Le message ${name} est en cours de publication, veuillez patienter...`, ephemeral: true });

			let messageManagerToDelete = null;
			if (existing_messages[0].id_channel) {
				try {
					messageManagerToDelete = new MessageManager(await interaction.client.channels.fetch(existing_messages[0].id_channel));
				}
				catch (error) {
					console.error(error);
				}
			}

			for (const message of existing_messages) {
				if (messageManagerToDelete && message.id_message) {
					try {
						const message_to_delete = await messageManagerToDelete.fetch(message.id_message);
						await message_to_delete.delete();
					}
					catch (error) {
						console.error(error);
					}
				}

				const new_message = await interaction.channel.send({
					content: message.content,
					files: message.images ? message.images.split(',').map((i => { return `images/${i}`; })) : [],
					fetchReply: true,
				});

				await message.update({
					id_message: new_message.id,
					id_channel: interaction.channelId,
				});
			}

			return await interaction.editReply({ content: `Le message ${name} vient d'être publié`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'ajouter-modifier') {
			await interaction.deferReply({ ephemeral: true });
			const name = interaction.options.getString('nom');
			const existing_messages = await CustomMessages.findAll({ where: { name: name } });

			let custom_messages = null;
			let buttonPressed = null;
			let index = '0';
			let id_channel = null;

			if (existing_messages.length > 0) {
				id_channel = existing_messages[0].id_channel;
				custom_messages = [];
				for (const message of existing_messages) {
					custom_messages.push({
						content: message.content,
						images: message.images,
					});
				}
			}

			if (!custom_messages) {
				custom_messages = [{ content: `${name}`, images: null }];
			}

			const message = await interaction.editReply({
				content: custom_messages[index].content,
				components: [await getSelectDelete(custom_messages.length), ...await getEmbedsButton(custom_messages.length), getModifyButton()],
				files: custom_messages[index].images ? custom_messages[index].images.split(',').map((i => { return `images/${i}`; })) : [],
				ephemeral: true,
				fetchReply: true,
			});

			const messageFilter = m => {return m.author.id === interaction.user.id;};
			const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 840000 });
			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			messageCollector.on('collect', async m => {
				if (buttonPressed) {
					[, index] = buttonPressed.split('_');
					let images = null;

					if (m.attachments.size > 0) {
						for (const attachment of m.attachments.values()) {
							if (['image/png', 'image/jpeg', 'image/gif'].includes(attachment.contentType)) {
								const promise = new Promise((resolve, reject) => {
									const file = fs.createWriteStream(`images/${attachment.id}.${attachment.name.slice(-3)}`);
									https.get(attachment.url, function(response) {
										response.pipe(file);

										file.on('finish', () => {
											file.close();
											images = images ? `${images},${attachment.id}.${attachment.name.slice(-3)}` : `${attachment.id}.${attachment.name.slice(-3)}`;
											resolve();
										});

										file.on('error', (err) => {
											fs.unlink(`images/${attachment.id}.${attachment.name.slice(-3)}`, (error) => {
												if (error) {
													console.error(error);
												}
												reject(err);
											});
										});
									}).on('error', (err) => {
										reject(err);
									});
								});

								await promise;
							}
						}
					}

					if (interaction.guild.members.me.permissionsIn(m.channelId).has('ManageMessages')) {
						try {
							await m.delete();
						}
						catch (error) {
							console.error(error);
						}
					}

					if (m.content.length > 2000) {
						m.content = m.content.slice(0, 2000);
					}

					if (index === 'add') {
						custom_messages.push({
							content: m.content,
							images: images,
						});
					}
					else {
						custom_messages[index] = {
							content: m.content,
							images: images,
						};
					}

					buttonPressed = null;
					index = '0';

					await interaction.editReply({
						content: custom_messages[index].content,
						files: custom_messages[index].images ? custom_messages[index].images.split(',').map((i => { return `images/${i}`; })) : [],
						components: [await getSelectDelete(custom_messages.length), ...await getEmbedsButton(custom_messages.length, buttonPressed), getModifyButton()],
					});
				}
			});

			componentCollector.on('collect', async i => {
				try {
					await i.deferUpdate();
				}
				catch (error) {
					console.error(error);
					return;
				}

				if (i.customId === 'send') {
					messageCollector.stop();
					componentCollector.stop();

					let indexCustomMessage = 0;

					for (const exi_message of existing_messages) {
						if (custom_messages.length <= indexCustomMessage) {
							if (exi_message.images) {
								exi_message.images.split(',').map(img => {
									fs.unlink(`images/${img}`, (err) => {
										if (err) {
											console.error(err);
										}
									});
								});
							}

							if (!id_channel) {
								exi_message.destroy();
							}
							else {
								exi_message.update({
									content: null,
									images: null,
								});
							}
						}
						else {
							exi_message.update({
								content: custom_messages[indexCustomMessage].content,
								images: custom_messages[indexCustomMessage].images,
							});
							indexCustomMessage++;
						}

					}

					if (indexCustomMessage < custom_messages.length) {
						for (let ind = indexCustomMessage ; ind < custom_messages.length ; ind++) {
							await CustomMessages.upsert({
								name: `${name}`,
								content: custom_messages[ind].content,
								images: custom_messages[ind].images,
							});
						}
					}

					if (id_channel) {
						const messages = await CustomMessages.findAll({ where: { name: `${name}` } });
						let channel = null;
						let messageManager = null;

						try {
							channel = await interaction.client.channels.fetch(id_channel);
							messageManager = new MessageManager(channel);
						}
						catch (error) {
							console.error(error);
						}

						if (channel && messageManager) {
							let haveToCreate = false;
							for (const msg of messages) {
								if (msg.id_message) {
									if (msg.content !== null) {
										try {
											const message_to_update = await messageManager.fetch(msg.id_message);
											if (haveToCreate || !message_to_update) {
												const new_message = await channel.send({
													content: msg.content,
													files: msg.images ? msg.images.split(',').map((im => { return `images/${im}`; })) : [],
													fetchReply: true,
												});
												await msg.update({
													id_channel: id_channel,
													id_message: new_message.id,
												});
												if (message_to_update) {
													await message_to_update.delete();
												}
											}
											else {
												await message_to_update.edit({
													content: msg.content,
													files: msg.images ? msg.images.split(',').map((im => { return `images/${im}`; })) : [],
												});
											}
										}
										catch (error) {
											haveToCreate = true;
											const new_message = await channel.send({
												content: msg.content,
												files: msg.images ? msg.images.split(',').map((im => { return `images/${im}`; })) : [],
												fetchReply: true,
											});
											await msg.update({
												id_channel: id_channel,
												id_message: new_message.id,
											});
										}
									}
									else {
										try {
											const message_to_delete = await messageManager.fetch(msg.id_message);
											await message_to_delete.delete();
										}
										catch (error) {
											console.error(error);
										}
										await msg.destroy();
									}
								}
								else {
									haveToCreate = true;
									const new_message = await channel.send({
										content: msg.content,
										files: msg.images ? msg.images.split(',').map((im => { return `images/${im}`; })) : [],
										fetchReply: true,
									});
									await msg.update({
										id_channel: id_channel,
										id_message: new_message.id,
									});
								}
							}
						}
					}
					return;
				}
				else if (i.customId === 'cancel') {
					messageCollector.stop();
					componentCollector.stop();
					return;
				}
				else if (i.customId === 'regl_delete') {
					buttonPressed = null;
					index = '0';

					custom_messages.splice(i.values[0], 1);

					if (custom_messages.length === 0) {
						custom_messages = [{ content: `${name}`, images: null }];
					}
				}
				else {
					buttonPressed = i.customId;
					[, index] = buttonPressed.split('_');
				}

				await i.editReply({
					content: index === 'add' ? `${name}` : custom_messages[index].content,
					files: index === 'add' ? [] : custom_messages[index].images ? custom_messages[index].images.split(',').map((im => { return `images/${im}`; })) : [],
					components: [await getSelectDelete(custom_messages.length), ...await getEmbedsButton(custom_messages.length, buttonPressed), getModifyButton()],
				});
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			await interaction.deferReply({ ephemeral: true });
			const name = interaction.options.getString('nom');
			const existing_messages = await CustomMessages.findAll({ where: { name: name } });

			if (existing_messages.length === 0) {
				return await interaction.editReply({ content: `${name} ne correspond à aucun message existant`, ephemeral: true });
			}

			let messageManagerToDelete = null;
			if (existing_messages[0].id_channel) {
				try {
					messageManagerToDelete = new MessageManager(await interaction.client.channels.fetch(existing_messages[0].id_channel));
				}
				catch (error) {
					console.error(error);
				}
			}

			for (const message of existing_messages) {
				if (message.images) {
					message.images.split(',').map(img => {
						fs.unlink(`images/${img}`, (err) => {
							if (err) {
								console.error(err);
							}
						});
					});
				}

				if (messageManagerToDelete && message.id_message) {
					try {
						const message_to_delete = await messageManagerToDelete.fetch(message.id_message);
						await message_to_delete.delete();
					}
					catch (error) {
						console.error(error);
					}
				}

				message.destroy();
			}

			return await interaction.editReply({ content: `${name} vient d'être supprimé`, ephemeral: true });
		}
	},
};

const getModifyButton = () => {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder({ customId: 'send', label: 'Sauvegarder', emoji: '💾', style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'cancel', label: 'Annuler', style: ButtonStyle.Danger }),
	);
};

const getEmbedsButton = async (size, buttonPressed = null) => {
	const options = [];

	for (let i = 0 ; i < size ; i++) {
		options.push(new ButtonBuilder({ customId: `embed_${i}`, label: i === 0 ? `${i + 1}er message` : `${i + 1}ème message`, style: `embed_${i}` === buttonPressed ? ButtonStyle.Success : ButtonStyle.Secondary }));
	}
	if (size < 10) {
		options.push(new ButtonBuilder({ customId: 'embed_add', label: 'Ajouter un message', style: buttonPressed === 'embed_add' ? ButtonStyle.Success : ButtonStyle.Secondary }));
	}

	if (options.length <= 5) {
		return [new ActionRowBuilder().addComponents(...options)];
	}
	else {
		return [new ActionRowBuilder().addComponents(...options.slice(0, 5)), new ActionRowBuilder().addComponents(...options.slice(5))];
	}
};

const getSelectDelete = async (size = 1) => {
	const options = [];
	for (let i = 0 ; i < size ; i++) {
		options.push({ label: i === 0 ? `${i + 1}er message` : `${i + 1}ème message`, value: `${i}` });
	}

	return new ActionRowBuilder()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('regl_delete')
				.addOptions(...options)
				.setPlaceholder('Supprimer un message'),
		);
};
