const path = require('path');
const { loadDashboard } = require(path.join(__dirname, '../../dashboard/main'));

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		loadDashboard(client);
	},
};
