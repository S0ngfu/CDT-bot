const cron = require('node-cron');
const { Vehicle, VehicleTaken } = require('../dbObjects.js');

let in_service = 0;

module.exports = {
	initCrons(client) {
		cron.schedule('*/10 * * * * *', async function() {
			const vehiclesTaken = await VehicleTaken.count({ distinct: true, col: 'id_vehicle', include: { model: Vehicle, where: { can_take_break: true } } });
			if (in_service !== vehiclesTaken) {
				in_service = vehiclesTaken;
				if (vehiclesTaken > 0) {
					client.user.setActivity({ name: `${vehiclesTaken} ${vehiclesTaken === 1 ? 'camion' : 'camions'}`, type: 'WATCHING' });
				}
				else {
					client.user.setActivity({ name: 'le domaine', type: 'WATCHING' });
				}
			}
		});
	},
};
