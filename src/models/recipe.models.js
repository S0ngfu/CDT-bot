module.exports = (sequelize, DataTypes) => {
	return sequelize.define('recipe', {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		id_product_made: DataTypes.INTEGER,
		quantity_product_made: DataTypes.INTEGER,
		id_product_ingredient_1: DataTypes.INTEGER,
		quantity_product_ingredient_1: DataTypes.INTEGER,
		id_product_ingredient_2: DataTypes.INTEGER,
		quantity_product_ingredient_2: DataTypes.INTEGER,
		id_product_ingredient_3: DataTypes.INTEGER,
		quantity_product_ingredient_3: DataTypes.INTEGER,
	}, {
		timestamps: false,
	});
};
