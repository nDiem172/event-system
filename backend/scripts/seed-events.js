require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Event = require('../models/Event');

const mustGetEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env ${key}. Please set it in backend/.env`);
  return value;
};

const main = async () => {
  const mongoUri = mustGetEnv('MONGO_URI');
  await mongoose.connect(mongoUri);

  const creatorEmail = 'creator@eventsystem.local';
  const creatorPassword = 'Creator@123';

  let creator = await User.findOne({ email: creatorEmail });
  if (!creator) {
    creator = await User.create({
      fullName: 'Demo Creator',
      email: creatorEmail,
      phone: '0900000001',
      password: creatorPassword,
      role: 'Content_Creator',
      status: 'Active',
    });
  } else {
    const needUpdate =
      creator.role !== 'Content_Creator' ||
      creator.status !== 'Active';
    if (needUpdate) {
      creator.role = 'Content_Creator';
      creator.status = 'Active';
      await creator.save();
    }
  }

  const now = new Date();
  const inDaysAt = (days, hour, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const events = [
    {
      title: 'Workshop MERN Fullstack (Demo)',
      description:
        'Workshop thực hành MERN: auth, CRUD sự kiện, đăng ký vé, check-in QR.',
      location: 'Phòng A101',
      category: 'Workshop',
      startTime: inDaysAt(3, 9),
      endTime: inDaysAt(3, 11, 30),
      bannerUrl:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60',
      ticketTypes: [
        { name: 'General', price: 0, quantity: 80, available: 80 },
        { name: 'VIP', price: 50000, quantity: 20, available: 20 },
      ],
    },
    {
      title: 'Talkshow: Kỹ năng phỏng vấn IT (Demo)',
      description:
        'Talkshow chia sẻ CV, phỏng vấn, câu hỏi thường gặp và lộ trình nghề nghiệp.',
      location: 'Hội trường B',
      category: 'Talkshow',
      startTime: inDaysAt(7, 18, 30),
      endTime: inDaysAt(7, 20, 30),
      bannerUrl:
        'https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1200&q=60',
      ticketTypes: [{ name: 'General', price: 0, quantity: 200, available: 200 }],
    },
    {
      title: 'Career Fair Mini (Demo)',
      description:
        'Gian hàng tuyển dụng, tư vấn nghề nghiệp, networking cùng doanh nghiệp.',
      location: 'Sảnh C',
      category: 'Sự kiện',
      startTime: inDaysAt(14, 8),
      endTime: inDaysAt(14, 16),
      bannerUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=60',
      ticketTypes: [
        { name: 'General', price: 0, quantity: 500, available: 500 },
      ],
    },
  ].map((e) => {
    const totalTickets = e.ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
    const availableTickets = e.ticketTypes.reduce((sum, t) => sum + t.available, 0);
    return {
      ...e,
      totalTickets,
      availableTickets,
      status: 'Public',
      createdBy: creator._id,
      approvedBy: creator._id,
      approvedAt: new Date(),
    };
  });

  const titles = events.map((e) => e.title);
  await Event.deleteMany({ createdBy: creator._id, title: { $in: titles } });
  const inserted = await Event.insertMany(events);

  console.log(`Seeded ${inserted.length} events.`);
  console.log(`Demo creator: ${creatorEmail} / ${creatorPassword}`);

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

