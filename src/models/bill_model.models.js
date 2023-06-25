module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill_model', {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		id_employe: DataTypes.INTEGER,
		data: DataTypes.JSON,
		name: DataTypes.STRING,
		emoji: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
