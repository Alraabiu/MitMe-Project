import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected ✓');

  const usersCol = mongoose.connection.collection('users');

  // Count before
  const before = await usersCol.countDocuments({
    role: { $in: ['student', 'teacher', 'user', 'moderator'] },
  });
  console.log('Users to migrate:', before);

  // Update all legacy roles to 'member'
  const result = await usersCol.updateMany(
    { role: { $in: ['student', 'teacher', 'user', 'moderator'] } },
    { $set: { role: 'member' } }
  );
  console.log('Updated:', result.modifiedCount, 'users');

  // Also handle users with no role at all
  const noRole = await usersCol.countDocuments({ role: { $exists: false } });
  if (noRole > 0) {
    const result2 = await usersCol.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'member' } }
    );
    console.log('Set default for', result2.modifiedCount, 'users without role');
  }

  // Verify
  const remaining = await usersCol.countDocuments({
    role: { $nin: ['member', 'admin'] },
  });
  console.log('Remaining legacy roles:', remaining);

  await mongoose.disconnect();
  console.log('Done ✓');
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
