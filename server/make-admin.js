import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Usage: node make-admin.js <email>');
  process.exit(1);
}

const run = async () => {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.execute('SELECT id, email, role FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const user = users[0];

    if (user.role === 'admin') {
      console.log(`User ${email} is already admin.`);
      process.exit(0);
    }

    await connection.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
    console.log(`User ${email} promoted to admin successfully.`);
  } catch (error) {
    console.error('Failed to promote user to admin:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
