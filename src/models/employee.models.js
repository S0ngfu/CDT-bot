module.exports = (sequelize, DataTypes) => {
	return sequelize.define('enterprise', {
		id_employee: {
			type: DataTypes.STRING,
		},
		name_employee: DataTypes.STRING,
		phone_number: DataTypes.STRING,
		wage: DataTypes.INTEGER,
		date_hiring: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		date_cdd: {
			type: DataTypes.DATE,
		},
		date_cdi: {
			type: DataTypes.DATE,
		},
		date_firing: {
			type: DataTypes.DATE,
		},
		driving_licence: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		date_medical_checkup: DataTypes.DATE,
		id_channel: DataTypes.STRING,
		id_message: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
