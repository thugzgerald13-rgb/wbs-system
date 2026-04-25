CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  meter_no TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  as_of TEXT,
  account_no TEXT,
  name TEXT,
  address TEXT,
  meter_no TEXT,
  period_from TEXT,
  period_to TEXT,
  due_date TEXT,
  disconnection_date TEXT,
  present REAL DEFAULT 0,
  previous REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  assoc REAL DEFAULT 0,
  previous_account REAL DEFAULT 0,
  previous_months TEXT,
  receiver TEXT,
  status TEXT DEFAULT 'Unpaid',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_no TEXT NOT NULL,
  payment_date TEXT,
  amount REAL DEFAULT 0,
  reference TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS business_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  address TEXT,
  contact TEXT
);
