import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    require_phone BOOLEAN NOT NULL DEFAULT 0,
    require_company BOOLEAN NOT NULL DEFAULT 0,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    checked_in BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec('ALTER TABLE registrations RENAME COLUMN email TO department;');
} catch (e) {
  // Column might already be renamed or table newly created
}

try {
  db.exec('ALTER TABLE config ADD COLUMN logo_url TEXT;');
} catch (e) {
  // Column might already exist
}

// Insert default config if not exists
const configExists = db.prepare('SELECT COUNT(*) as count FROM config').get() as { count: number };
if (configExists.count === 0) {
  db.prepare('INSERT INTO config (id, event_name, event_date) VALUES (1, ?, ?)').run('RAISA (Ramadhan Internesyenel Antar Bangsa)', '2026-03-15');
} else {
  // Update existing config to match the new title if requested
  db.prepare('UPDATE config SET event_name = ? WHERE id = 1').run('RAISA (Ramadhan Internesyenel Antar Bangsa)');
}

// Insert default admin user if not exists
const userExists = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userExists.count === 0) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

  // Auth Routes
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json(req.user);
  });

  // User Management Routes
  app.get('/api/users', authenticateToken, (req, res) => {
    try {
      const users = db.prepare('SELECT id, username, created_at FROM users').all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticateToken, (req, res) => {
    try {
      const { username, password } = req.body;
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, (req: any, res) => {
    try {
      if (req.user.id === parseInt(req.params.id)) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.put('/api/users/:id/password', authenticateToken, (req: any, res) => {
    try {
      const { password } = req.body;
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // API Routes
  app.get('/api/config', authenticateToken, (req, res) => {
    try {
      const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  app.put('/api/config', authenticateToken, (req, res) => {
    try {
      const { event_name, event_date, require_phone, require_company, logo_url } = req.body;
      db.prepare(
        'UPDATE config SET event_name = ?, event_date = ?, require_phone = ?, require_company = ?, logo_url = ? WHERE id = 1'
      ).run(event_name, event_date, require_phone ? 1 : 0, require_company ? 1 : 0, logo_url || null);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  app.post('/api/register', authenticateToken, (req, res) => {
    try {
      const { name, department, phone, company } = req.body;
      const barcode_id = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const stmt = db.prepare(
        'INSERT INTO registrations (barcode_id, name, department, phone, company) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run(barcode_id, name, department, phone || null, company || null);
      
      res.json({ success: true, barcode_id });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/register/batch', authenticateToken, (req, res) => {
    try {
      const attendees = req.body.attendees;
      if (!Array.isArray(attendees)) {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      const insert = db.prepare(
        'INSERT INTO registrations (barcode_id, name, department, phone, company) VALUES (?, ?, ?, ?, ?)'
      );

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          const barcode_id = item.qr_code || Math.random().toString(36).substring(2, 10).toUpperCase();
          insert.run(barcode_id, item.name, item.department, item.phone || null, item.company || null);
        }
      });

      insertMany(attendees);
      res.json({ success: true, count: attendees.length });
    } catch (error) {
      console.error('Batch registration error:', error);
      res.status(500).json({ error: 'Batch registration failed' });
    }
  });

  app.get('/api/registrations', authenticateToken, (req, res) => {
    try {
      const registrations = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC').all();
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  });

  app.get('/api/registrations/:barcode_id', authenticateToken, (req, res) => {
    try {
      const reg = db.prepare('SELECT * FROM registrations WHERE barcode_id = ?').get(req.params.barcode_id);
      if (reg) {
        res.json(reg);
      } else {
        res.status(404).json({ error: 'Registration not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch registration' });
    }
  });

  app.delete('/api/registrations/:id', authenticateToken, (req, res) => {
    try {
      const result = db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Registration not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete registration' });
    }
  });

  app.post('/api/checkin/:barcode_id', authenticateToken, (req, res) => {
    try {
      const reg = db.prepare('SELECT checked_in FROM registrations WHERE barcode_id = ?').get(req.params.barcode_id) as { checked_in: number } | undefined;
      
      if (!reg) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      const newStatus = reg.checked_in ? 0 : 1;
      const result = db.prepare('UPDATE registrations SET checked_in = ? WHERE barcode_id = ?').run(newStatus, req.params.barcode_id);
      
      if (result.changes > 0) {
        res.json({ success: true, checked_in: newStatus });
      } else {
        res.status(404).json({ error: 'Registration not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Check-in failed' });
    }
  });

  app.get('/api/stats', authenticateToken, (req, res) => {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM registrations').get() as { count: number };
      const checkedIn = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE checked_in = 1').get() as { count: number };
      res.json({
        total: total.count,
        checkedIn: checkedIn.count,
        pending: total.count - checkedIn.count
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

// Vite middleware for development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then(vite => {
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
