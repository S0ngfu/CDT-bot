module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill', {
		id_bill: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		date_bill: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		sum_bill: DataTypes.INTEGER,
		id_enterprise: DataTypes.INTEGER,
		id_employe: DataTypes.STRING,
		info: DataTypes.STRING,
		onTab: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	}, {
		timestamps: false,
	});
};
