/**
 * helpers/response.formatter.js
 * Formatter Standar Response FKTP MASK
 * Menyediakan response JSON terstruktur sesuai standar HTTP status code
 */

const success = (data = {}, message = null, code = 200, emptyResponse = false) => ({
    metaData: {
      code,
      message: message ?? (code === 200 ? 'Sukses' : 'Berhasil')
    },
    response: emptyResponse ? "" : data
  });
  
  /**
   * Digunakan saat data berhasil dibuat
   */
  const created = (data = {}, message = 'Data berhasil dibuat', code = 201) => ({
    metaData: { code, message },
    response: data
  });
  
  /**
   * Request gagal secara umum
   */
  const fail = (message = 'Permintaan tidak valid', code = 400) => ({
    metaData: { code, message },
    response: null
  });
  
  /**
   * Validasi gagal
   */
  const validationError = (errors = {}, message = 'Validasi gagal', code = 422) => ({
    metaData: { code, message },
    errors
  });
  
  /**
   * Data tidak ditemukan
   */
  const notFound = (message = 'Data tidak ditemukan', code = 404) => ({
    metaData: { code, message },
    response: null
  });
  
  /**
   * Tidak otorisasi
   */
  const unauthorized = (message = 'Tidak memiliki otorisasi', code = 401) => ({
    metaData: { code, message },
    response: null
  });
  
  /**
   * Akses ditolak
   */
  const forbidden = (message = 'Akses ditolak', code = 403) => ({
    metaData: { code, message },
    response: null
  });
  
  /**
   * Konflik data
   */
  const conflict = (message = 'Data sudah ada', code = 409) => ({
    metaData: { code, message },
    response: null
  });
  
  /**
   * Kesalahan internal server
   */
  const internalError = (errorMessage = 'Terjadi kesalahan pada server', code = 500) => ({
    metaData: { code, message: errorMessage },
    response: null
  });
  
  module.exports = {
    success,
    created,
    fail,
    validationError,
    notFound,
    conflict,
    unauthorized,
    forbidden,
    internalError
  };
  