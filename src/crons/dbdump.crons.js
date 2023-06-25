const cron = require('node-cron');
const mysqldump = require('mysqldump');
const fs = require('fs');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});
let nb_files = 10;

module.exports = {
	initCrons(client) {
		cron.schedule('0 5,13,21 * * *', async function() {
			console.log('test');
			await mysqldump({
				connection: {
					host: process.env.DATABASE_HOST || 'database',
					database: process.env.DATABASE_NAME || 'cdtbot',
					user: process.env.DATABASE_USERNAME || 'user',
					password: process.env.DATABASE_PASSWORD || 'admin',
				},
				dumpToFile: `./dumps/cdt_${moment().format('YYYY-MM-DD_HH-mm-ss')}.sql`,
			});

			const dumpFiles = fs.readdirSync('./dumps').filter(file => file.endsWith('.sql'));

			if (dumpFiles.length > nb_files) {
				dumpFiles.slice(0, dumpFiles.length - nb_files).map(file => fs.unlinkSync(`./dumps/${file}`));
			}
		}, {
			timezone: 'Europe/Paris',
		});
	},
};
