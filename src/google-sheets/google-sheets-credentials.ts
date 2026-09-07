import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import { google } from 'googleapis';

const GOOGLE_KEY_PATH = process.env.GOOGLE_KEY_PATH;
if (!GOOGLE_KEY_PATH) {
  throw new Error('GOOGLE_KEY_PATH is not defined in environment variables');
}

const keyPath = path.join(process.cwd(), GOOGLE_KEY_PATH);
const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export default auth;
