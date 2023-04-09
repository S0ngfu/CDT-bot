module.exports = (sequelize, DataTypes) => {
	return sequelize.define('custom_messages', {
		id_message: DataTypes.STRING,
		id_channel: DataTypes.STRING,
		name: DataTypes.STRING,
		content: DataTypes.STRING,
		images: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
