module.exports = (sequelize, DataTypes) => {
	return sequelize.define('phone_book', {
		id_message: {
			type: DataTypes.STRING,
		},
		id_channel: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
