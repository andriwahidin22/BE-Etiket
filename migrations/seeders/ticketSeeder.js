'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Tickets', [
      {
        nama: 'Tiket Konser', // Menambahkan nama tiket
        harga: 100000, // Contoh harga
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Tiket Pertandingan', // Menambahkan nama tiket
        harga: 150000, // Contoh harga
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        harga: 100000, // Contoh harga
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        harga: 150000, // Contoh harga
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Tickets', null, {});
  }
};
