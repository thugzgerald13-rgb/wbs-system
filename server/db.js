const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "data", "wbs.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

const existing = db.prepare("SELECT id FROM users WHERE username=?").get("admin");
if (!existing) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", hash, "ADMIN");
}

const consumerCount = db.prepare("SELECT COUNT(*) as c FROM consumers").get().c;
if (!consumerCount) {
  db.prepare("INSERT INTO consumers (account_no, name, address, meter_no) VALUES (?, ?, ?, ?)").run(
    "HH00-208", "Bloomingline Trucking/Hauling (Pecson)", "Blk 3, Lot 3 Fr., Masi St.", "22-005841"
  );
}

const periodCount = db.prepare("SELECT COUNT(*) as c FROM billing_periods").get().c;
if (!periodCount) db.prepare("INSERT INTO billing_periods (period) VALUES (?)").run("December, 2025");

const billCount = db.prepare("SELECT COUNT(*) as c FROM bills").get().c;
if (!billCount) {
  db.prepare(`INSERT INTO bills
  (period, as_of, account_no, due_date, disconnection_date, name, address, meter_no, period_from, period_to, present, previous, rate, assoc, previous_account, previous_months, receiver, status)
  VALUES (@period,@as_of,@account_no,@due_date,@disconnection_date,@name,@address,@meter_no,@period_from,@period_to,@present,@previous,@rate,@assoc,@previous_account,@previous_months,@receiver,@status)`).run({
    period:"December, 2025", as_of:"2025-12-24", account_no:"HH00-208", due_date:"2026-01-05", disconnection_date:"2026-01-11",
    name:"Bloomingline Trucking/Hauling (Pecson)", address:"Blk 3, Lot 3 Fr., Masi St.", meter_no:"22-005841",
    period_from:"2025-11-25", period_to:"2025-12-24", present:961, previous:941, rate:18.65, assoc:50,
    previous_account:13043, previous_months:"May. 2025, Jul. 2025, Jun.", receiver:"ROCHELLE ZORILLA", status:"Unpaid"
  });
}

const info = db.prepare("SELECT id FROM business_info WHERE id=1").get();
if (!info) {
  db.prepare("INSERT INTO business_info (id, name, address, contact) VALUES (1, ?, ?, ?)").run(
    "HOLIDAY HILLS SSS VILLAGE HOMEOWNERS ASSOCIATION INC.",
    "Barangay San Antonio, City of San Pedro, Laguna",
    ""
  );
}

module.exports = db;
