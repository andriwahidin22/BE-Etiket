module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('purchases', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            ticket_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            partner_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'partners',
                    key: 'id'
                }
            },
            jumlah: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            total_harga: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            tanggal: {
                type: Sequelize.DATE,
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
        return queryInterface.dropTable('purchases');
    }
};
