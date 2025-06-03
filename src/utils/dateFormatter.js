// src/utils/dateFormatter.js
function formatIndonesianDate(date) {
  const options = { 
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric' 
  };
  return date.toLocaleDateString('id-ID', options);
}

module.exports = { formatIndonesianDate };