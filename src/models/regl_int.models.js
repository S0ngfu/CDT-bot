module.exports = (sequelize, DataTypes) => {
	return sequelize.define('reglement_int', {
		id_message: DataTypes.STRING,
		id_channel: DataTypes.STRING,
		embeds: DataTypes.JSON,
	}, {
		timestamps: false,
	});
};
