import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt'; // For secure password hashing
import { changedb } from '@/services/mongo';
import { Collection } from 'mongoose';
const router = express.Router();

const { verifyAdminToken, generateAdminToken } = require('./auth'); // Replace with your authentication logic

// Interface for Admin data (replace with your actual model)
interface Admin {
  id: number;
  pin: string; // Hashed pin
}

async function getAdminById(id: string): Promise<Admin | null> {
  const db = changedb(); // Replace with your database name
  const admins = db.collection('admins') as Collection<Admin>; // Replace with your collection name

  return await admins.findOne({ _id: id });
}

export async function updateAdminPin(id: string, hashedPin: string): Promise<void> {
  const db = changedb(); // Replace with your database name
  const admins = db.collection<Admin>('admins'); // Replace with your collection name

  await admins.updateOne({ _id: id }, { $set: { pin: hashedPin } });
}
// Replace with your data store access logic (e.g., database connection)
const db: {
  getAdminById: (id: number) => Promise<Admin | null>;
  updateAdminPin: (id: number, hashedPin: string) => Promise<void>;
} = require('./db');

type VerifyAdminTokenRequest = Request & { admin: Admin }; // Extend Request with admin object

router.post('/update-pin', verifyAdminToken as (req: VerifyAdminTokenRequest, res: Response) => void, async (req, res) => {
  try {
    const { newPin } = req.body;

    // Validate new pin (optional)
    if (!newPin || newPin.length < 8) {
      return res.status(400).json({ message: 'Invalid new pin (minimum 8 characters)' });
    }

    // Retrieve current admin user from database
    const currentAdmin = await db.getAdminById(req.admin.id);

    if (!currentAdmin) {
      return res.status(401).json({ message: 'Unauthorized' }); // Handle missing admin user
    }

    // Hash the new pin securely using bcrypt
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update admin pin in database
    await db.updateAdminPin(currentAdmin.id, hashedPin);

    // Generate a new admin token on successful update (optional)
    const newToken = generateAdminToken(currentAdmin);

    res.json({ message: 'Admin pin updated successfully', token: newToken }); // Send success message and token (optional)
  } catch (error) {
    console.error('Error updating admin pin:', error);
    res.status(500).json({ message: 'Error updating pin, please try again' });
  }
});

module.exports = router;
