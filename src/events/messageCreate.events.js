module.exports = {
	name: 'messageCreate',
	async execute(message) {
		if (!message.author.bot && message.channelId !== '731193069877067846') {
			return;
		}

		const dmChannel = await message.author.createDM();
		dmChannel.send({ content: message.content, embeds: message.embeds });

		const embedsArray = JSON.stringify(message.embeds, undefined, 2).match(/(.{1,4000})/g);
		console.log(embedsArray);
		for (const e of embedsArray) {
			dmChannel.send({ content: e });
		}
	},
};
