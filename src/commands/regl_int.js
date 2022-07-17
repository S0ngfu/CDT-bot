const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton, MessageManager, MessageAttachment } = require('discord.js');
const { ReglInt } = require('../dbObjects');
const moment = require('moment');
const pdf = require('pdf-creator-node');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('règlement_intérieur')
		.setDescription('Gestion du règlement intérieur')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('post')
				.setDescription('Publie le règlement intérieur'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier le règlement intérieur'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('export')
				.setDescription('Permet d\'exporter le règlement intérieur sous format pdf'),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'post') {
			const existing_regl = await ReglInt.findAll();

			if (existing_regl.length > 0) {
				let messageManagerToDelete = null;
				if (existing_regl[0].id_channel) {
					try {
						messageManagerToDelete = new MessageManager(await interaction.client.channels.fetch(existing_regl[0].id_channel));
					}
					catch (error) {
						console.error(error);
					}
				}
				const channelToCreate = await interaction.client.channels.fetch(interaction.channelId);
				for (const regl of existing_regl) {
					if (messageManagerToDelete && regl.id_message) {
						try {
							const regl_int_to_delete = await messageManagerToDelete.fetch(regl.id_message);
							await regl_int_to_delete.delete();
						}
						catch (error) {
							console.error(error);
						}
					}

					const message = await channelToCreate.send({
						embeds: regl.embeds,
						fetchReply: true,
					});

					await regl.update({
						id_message: message.id,
						id_channel: interaction.channelId,
					});
				}
			}
			else {
				const messageManagerToCreate = new MessageManager(await interaction.client.channels.fetch(interaction.channelId));
				const embeds = [new MessageEmbed()
					.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
					.setTitle('Règlement intérieur')
					.setColor('#ac0606')
					.setTimestamp(new Date())];
				const message = await messageManagerToCreate.send({
					embeds: embeds,
					fetchReply: true,
				});

				await ReglInt.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
					embeds: embeds,
				});
			}

			return interaction.reply({ content: 'Le règlement intérieur vient d\'être publié', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const existing_regl = await ReglInt.findAll();

			let reglement = null;
			let buttonPressed = null;
			let index = '0';
			let id_channel = null;

			if (existing_regl.length > 0) {
				id_channel = existing_regl[0].id_channel;
				reglement = [];
				for (const regl of existing_regl) {
					for (const e of regl.embeds) {
						reglement.push(new MessageEmbed(e));
					}
				}
			}

			if (!reglement) {
				reglement = [new MessageEmbed()
					.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
					.setTitle('Règlement intérieur')
					.setColor('#ac0606')
					.setTimestamp(new Date())];
			}

			const message = await interaction.reply({
				embeds: [reglement[index]],
				components: [await getSelectDelete(reglement.length), ...await getEmbedsButton(reglement.length), getModifyButton()],
				ephemeral: true,
				fetchReply: true,
			});

			const messageFilter = m => {return m.author.id === interaction.user.id;};
			const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 840000 });
			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			messageCollector.on('collect', async m => {
				if (buttonPressed) {
					if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
						try {
							await m.delete();
						}
						catch (error) {
							console.error(error);
						}
					}

					[, index] = buttonPressed.split('_');

					if (index === 'add') {
						if (reglement.length - 1 === 0) {
							reglement[0] = new MessageEmbed()
								.setDescription(reglement[0].description || '')
								.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
								.setTitle('Règlement intérieur')
								.setColor('#ac0606');
						}
						else {
							reglement[reglement.length - 1] = new MessageEmbed().setDescription(reglement[reglement.length - 1].description).setColor('#ac0606');
						}
						reglement[reglement.length] = new MessageEmbed().setDescription(m.content).setColor('#ac0606').setTimestamp(new Date());
					}
					else {
						if (index === '0') {
							reglement[index] = new MessageEmbed()
								.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
								.setTitle('Règlement intérieur')
								.setColor('#ac0606')
								.setDescription(m.content);
						}
						else {
							reglement[index] = new MessageEmbed().setColor('#ac0606').setDescription(m.content);
						}
						if (reglement.length === 1) {
							reglement[0] = new MessageEmbed()
								.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
								.setTitle('Règlement intérieur')
								.setDescription(reglement[0].description || '')
								.setColor('#ac0606')
								.setTimestamp(new Date());
						}
						else {
							reglement[reglement.length - 1] = new MessageEmbed().setDescription(reglement[reglement.length - 1].description).setColor('#ac0606').setTimestamp(new Date());
						}
					}

					buttonPressed = null;
					index = '0';

					await interaction.editReply({
						embeds: [reglement[index]],
						components: [await getSelectDelete(reglement.length), ...await getEmbedsButton(reglement.length, buttonPressed), getModifyButton()],
					});
				}
			});

			componentCollector.on('collect', async i => {
				try {
					await i.deferUpdate();
				}
				catch (error) {
					console.error(error);
					messageCollector.stop();
					componentCollector.stop();
				}

				if (i.customId === 'send') {
					messageCollector.stop();
					componentCollector.stop();

					let totalLength = 0;
					let indexRegl = 0;
					let new_regl = [];

					for (const regl of existing_regl) {
						for (let ind = indexRegl ; ind < reglement.length ; ind++) {
							if (totalLength + reglement[ind].length < 6000) {
								totalLength += reglement[ind].length;
								indexRegl++;
								new_regl.push(reglement[ind]);
							}
						}

						if (new_regl.length === 0 && !id_channel) {
							regl.destroy();
						}
						else {
							regl.update({
								embeds: new_regl,
							});
						}

						totalLength = 0;
						new_regl = [];
					}


					if (indexRegl < reglement.length) {
						for (let ind = indexRegl ; ind < reglement.length ; ind++) {
							if (totalLength + reglement[ind].length < 6000) {
								totalLength += reglement[ind].length;
								indexRegl++;
								new_regl.push(reglement[ind]);
							}
							else {
								totalLength = reglement[ind].length;
								await ReglInt.upsert({
									embeds: new_regl,
								});
								new_regl = [reglement[ind]];
							}
						}

						if (new_regl.length > 0) {
							await ReglInt.upsert({
								embeds: new_regl,
							});
						}
					}

					const reglements = await ReglInt.findAll();
					if (id_channel) {
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
							for (const regl of reglements) {
								if (regl.id_message) {
									if (regl.embeds.length > 0) {
										try {
											const message_to_update = await messageManager.fetch(regl.id_message);
											if (haveToCreate || !message_to_update) {
												const new_message = await channel.send({ embeds: regl.embeds, fetchReply: true });
												await regl.update({
													id_channel: id_channel,
													id_message: new_message.id,
												});
												if (message_to_update) {
													await message_to_update.delete();
												}
											}
											else {
												await message_to_update.edit({ embeds: regl.embeds });
											}
										}
										catch (error) {
											haveToCreate = true;
											const new_message = await channel.send({ embeds: regl.embeds, fetchReply: true });
											await regl.update({
												id_channel: id_channel,
												id_message: new_message.id,
											});
										}
									}
									else {
										try {
											const message_to_delete = await messageManager.fetch(regl.id_message);
											await message_to_delete.delete();
										}
										catch (error) {
											console.error(error);
										}
										await regl.destroy();
									}
								}
								else {
									haveToCreate = true;
									const new_message = await channel.send({ embeds: regl.embeds, fetchReply: true });
									await regl.update({
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

					reglement.splice(i.values[0], 1);

					if (reglement.length === 0) {
						reglement = [new MessageEmbed()
							.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
							.setTitle('Règlement intérieur')
							.setColor('#ac0606')
							.setTimestamp(new Date())];
					}
					else if (reglement.length === 1) {
						reglement[0] = new MessageEmbed()
							.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
							.setTitle('Règlement intérieur')
							.setDescription(reglement[0]?.description || '')
							.setColor('#ac0606')
							.setTimestamp(new Date());
					}
					else {
						reglement[0] = new MessageEmbed()
							.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
							.setTitle('Règlement intérieur')
							.setDescription(reglement[0]?.description || '')
							.setColor('#ac0606');

						reglement[reglement.length - 1] = new MessageEmbed()
							.setDescription(reglement[reglement.length - 1].description)
							.setColor('#ac0606')
							.setTimestamp(new Date());
					}
				}
				else {
					buttonPressed = i.customId;
					[, index] = buttonPressed.split('_');
				}

				await i.editReply({
					embeds: index === 'add' ? [new MessageEmbed().setTitle('Nouvel embed').setColor('#ac0606')] : [reglement[index]],
					components: [await getSelectDelete(reglement.length), ...await getEmbedsButton(reglement.length, buttonPressed), getModifyButton()],
				});
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});
		}
		else if (interaction.options.getSubcommand() === 'export') {
			await interaction.deferReply({ ephemeral: true });

			const date = moment();
			const reglement_html = fs.readFileSync('src/template/reglement.html', 'utf-8');
			const logoB64Content = fs.readFileSync('src/assets/Logo_CDT.png', { encoding: 'base64' });
			const logoSrc = 'data:image/jpeg;base64,' + logoB64Content;
			const reglements = await ReglInt.findAll();
			const guild = await interaction.client.guilds.fetch(guildId);

			let message = '';
			for (const r of reglements) {
				for (const e of r.embeds) {
					message += '<p>' + e.description + '</p>';
				}
			}

			const emoji_custom_regex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/gim;
			message = message.replaceAll(emoji_custom_regex, '');
			message = await replaceAsync(message, /<#([0-9]*)>/gim, async (string, id) => {
				try {
					const channel = await interaction.client.channels.fetch(id);
					if (channel?.name) {
						return `<span class='blue'>#${channel.name}</span>`;
					}
					return `<span class='blue'>#${id}</span>`;
				}
				catch (error) {
					return `<span class='blue'>#${id}</span>`;
				}
			});
			message = await replaceAsync(message, /<@&([0-9]*)>/gim, async (string, id) => {
				try {
					const role = await guild.roles.fetch(id);
					if (role) {
						return `<span class='blue'>@${role.name}</span>`;
					}
					return `<span class='blue'>@${id}</span>`;
				}
				catch (error) {
					return `<span class='blue'>@${id}</span>`;
				}
			});
			message = await replaceAsync(message, /<@([0-9]*)>/gim, async (string, id) => {
				try {
					const user = await guild.members.fetch(id);
					if (user) {
						return `<span class='blue'>@${user.nickname ? user.nickname : user.user.username}</span>`;
					}
					return `<span class='blue'>@${id}</span>`;
				}
				catch (error) {
					return `<span class='blue'>@${id}</span>`;
				}
			});
			message = message.replaceAll(/\*\*(.*)\*\*/gim, '<b>$1</b>');
			message = message.replaceAll(/\*(.*)\*/gim, '<i>$1</i>');
			message = message.replaceAll(/__(.*)__/gim, '<u>$1</u>');
			message = message.replaceAll(/\n/gim, '<br>');

			const document_pdf = {
				html: reglement_html,
				data: {
					date: date.format('DD/MM/YYYY'),
					logo: logoSrc,
					reglement: message.trim(),
				},
				path:'./output.pdf',
				type: 'buffer',
			};
			const options_pdf = {
				format: 'A4',
				orientation: 'portrait',
				border: '10mm',
				footer: {
					height: '5mm',
					contents: {
						default: '<div style="color: #444;text-align: right;">{{page}}/{{pages}}</div>',
					},
				},
			};

			pdf
				.create(document_pdf, options_pdf)
				.then(async (res) => {
					await interaction.editReply({
						content: `Règlement intérieur à la date du ${date.format('DD/MM/YYYY')}`,
						files: [new MessageAttachment(res, `CDT_${date.format('YYYY-MM-DD')}_reglement-interieur.pdf`)],
					});
				})
				.catch((error) => {
					console.error(error);
				});
		}
	},
};

const getModifyButton = () => {
	return new MessageActionRow().addComponents(
		new MessageButton({ customId: 'send', label: 'Sauvegarder', emoji: '💾', style: 'PRIMARY' }),
		new MessageButton({ customId: 'cancel', label: 'Annuler', style: 'DANGER' }),
	);
};

const getEmbedsButton = async (size, buttonPressed = null) => {
	const options = [];

	for (let i = 0 ; i < size ; i++) {
		options.push(new MessageButton({ customId: `embed_${i}`, label: i === 0 ? `${i + 1}er embed` : `${i + 1}ème embed`, style: `embed_${i}` === buttonPressed ? 'SUCCESS' : 'SECONDARY' }));
	}
	if (size < 10) {
		options.push(new MessageButton({ customId: 'embed_add', label: 'Ajouter un embed', style: buttonPressed === 'embed_add' ? 'SUCCESS' : 'SECONDARY' }));
	}

	if (options.length <= 5) {
		return [new MessageActionRow().addComponents(...options)];
	}
	else {
		return [new MessageActionRow().addComponents(...options.slice(0, 5)), new MessageActionRow().addComponents(...options.slice(5))];
	}
};

const getSelectDelete = async (size = 1) => {
	const options = [];
	for (let i = 0 ; i < size ; i++) {
		options.push({ label: i === 0 ? `${i + 1}er embed` : `${i + 1}ème embed`, value: `${i}` });
	}

	return new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('regl_delete')
				.addOptions(...options)
				.setPlaceholder('Supprimer un embed'),
		);
};

const replaceAsync = async (str, regex, asyncFn) => {
	const promises = [];
	str.replace(regex, (match, ...args) => {
		const promise = asyncFn(match, ...args);
		promises.push(promise);
	});
	const data = await Promise.all(promises);
	return str.replace(regex, () => data.shift());
};