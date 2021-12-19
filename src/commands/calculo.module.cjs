const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');
const { Enterprise, PriceEnterprise, Product, Group } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calculo')
		.setDescription('Affiche la calculatrice du domaine'),
	async execute(interaction) {
		// console.log('Enterprise: ', await Enterprise.findAll());
		// console.log('PriceEnterprise: ', await PriceEnterprise.findAll());
		// console.log('Product: ', await Product.findAll());
		// console.log('Group: ', await Group.findAll());
		// console.log('test: ', interaction);
		const message = await interaction.reply({
			content: 'Don Telo!',
			embeds: [await getDefaultEmbed(interaction)],
			components: [await getEnterprises()],
			ephemeral: true,
			fetchReply: true,
		});
		console.log(message.id);

		const collector = message.createMessageComponentCollector({ componentType: 'SELECT_MENU', time: 15000 });
		// -------------------------------------------------------------------------------------------- 900000 = 15 minutes ; 15000 = 15 secondes

		collector.on('collect', i => {
			if (i.user.id === interaction.user.id) {
				i.reply(`${i.user.id} clicked on the ${i.customId} button.`);
			}
			else {
				i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true });
			}
		});

		collector.on('end', collected => {
			console.log(`Collected ${collected.size} interactions.`);
			interaction.editReply({ content: 'Don Telo!', components: [] }); // Just remove components
		});
	},
};

const getDefaultEmbed = async (interaction) => {
	// console.log('interaction: ', interaction);
	// get enterprise
	// get product of default group
	// get groups
	// get user (name + emoji)
	const date = new Date();
	const embed = new MessageEmbed()
		.setColor('#ac0606')
		.setTitle('Client : Particulier')
		.setAuthor(interaction.member.nickname, interaction.user.avatarURL(false))
		.setDescription('Fait le ' + time(date), 'dddd d mmmm yyyy')
		.addFields(
			{ name: 'Jus d\'orange', value: '20 x 10 = 200$', inline: true },
			{ name: 'Limonades', value: '30 x 10 = 300$', inline: true },
			{ name: ':strawberry: Fraise', value: '10 x 5 = 50$', inline: true },
			{ name: 'Total', value: '550$' },
		)
		.setTimestamp(new Date());
	return embed;
};

const getEnterprises = async () => {
	const enterprises = await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise'], order: [['name_enterprise', 'ASC']] });

	const formatedE = enterprises.map(e => {
		return { label: e.name_enterprise, value: e.id_enterprise.toString() };
	});

	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('enterprises')
				.addOptions([{ label: 'Particulier', value: '0', default: true }, ...formatedE]),
		);
	return row;
};
