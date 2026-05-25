const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('Thiếu biến môi trường MONGO_URI. Hãy copy .env.example thành .env và điền MONGO_URI.');
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
