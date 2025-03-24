module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('tickets', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            nama: {
                type: Sequelize.STRING,
                allowNull: false
            },
            harga: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            kategori: { // New field added
                type: Sequelize.STRING,
                allowNull: false
            },
            stok: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('tickets');
    }
};
