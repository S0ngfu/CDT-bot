module.exports = {
	name: 'messageCreate',
	async execute(message) {
		if (!message.author.bot && message.channelId !== '731193069877067846') {
			return;
		}

		const dmChannel = await message.author.createDM();
		dmChannel.send({ content: message.content, embeds: message.embeds });
		dmChannel.send({ content: JSON.stringify(message.embeds, undefined, 2) });
	},
};
