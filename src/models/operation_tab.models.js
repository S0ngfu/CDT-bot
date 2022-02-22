module.exports = (sequelize, DataTypes) => {
	return sequelize.define('operation_tab', {
		id_enterprise: DataTypes.INTEGER,
		sum: DataTypes.INTEGER,
		date_operation: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		id_employe: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
