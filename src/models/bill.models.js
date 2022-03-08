module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill', {
		id_bill: {
			type: DataTypes.STRING,
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
		on_tab: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		ignore_transaction: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	}, {
		timestamps: false,
	});
};
