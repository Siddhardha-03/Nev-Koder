import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const normalizeName = (decodedToken) => {
  return String(
    decodedToken.name ||
    decodedToken.displayName ||
    decodedToken.email?.split('@')[0] ||
    'User'
  ).trim();
};

export const syncFirebaseUserToDatabase = async (decodedToken) => {
  const connection = await pool.getConnection();
  try {
    const uid = decodedToken.uid;
    const email = String(decodedToken.email || '').trim().toLowerCase();
    const name = normalizeName(decodedToken);

    if (!uid || !email) {
      throw new Error('Firebase token missing uid or email');
    }

    const [usersByUid] = await connection.execute(
      'SELECT * FROM users WHERE firebase_uid = ? LIMIT 1',
      [uid]
    );

    if (usersByUid.length > 0) {
      const existing = usersByUid[0];
      const nextVerifiedState = Boolean(existing.is_verified);
      await connection.execute(
        `UPDATE users
         SET name = ?, email = ?, is_verified = ?, auth_provider = 'firebase', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, nextVerifiedState, existing.id]
      );

      const [updatedRows] = await connection.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [existing.id]);
      return updatedRows[0];
    }

    const [usersByEmail] = await connection.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (usersByEmail.length > 0) {
      const existing = usersByEmail[0];
      const nextVerifiedState = Boolean(existing.is_verified);
      await connection.execute(
        `UPDATE users
         SET firebase_uid = ?, name = ?, is_verified = ?, auth_provider = 'firebase', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [uid, name, nextVerifiedState, existing.id]
      );

      const [updatedRows] = await connection.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [existing.id]);
      return updatedRows[0];
    }

    const randomPassword = await bcrypt.hash(`${uid}-${uuidv4()}`, 10);
    const [insertResult] = await connection.execute(
      `INSERT INTO users (name, email, password_hash, role, is_verified, firebase_uid, auth_provider)
       VALUES (?, ?, ?, 'user', ?, ?, 'firebase')`,
      [name, email, randomPassword, false, uid]
    );

    const [newRows] = await connection.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [insertResult.insertId]);
    return newRows[0];
  } finally {
    connection.release();
  }
};
