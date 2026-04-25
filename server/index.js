require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function mapBill(row) {
  if (!row) return row;
  return {
    id: row.id,
    period: row.period,
    asOf: row.as_of,
    accountNo: row.account_no,
    dueDate: row.due_date,
    disconnectionDate: row.disconnection_date,
    name: row.name,
    address: row.address,
    meterNo: row.meter_no,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    present: row.present,
    previous: row.previous,
    rate: row.rate,
    assoc: row.assoc,
    previousAccount: row.previous_account,
    previousMonths: row.previous_months,
    receiver: row.receiver,
    status: row.status
  };
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

app.get("/api/dashboard", auth, (req, res) => {
  const consumers = db.prepare("SELECT COUNT(*) c FROM consumers").get().c;
  const bills = db.prepare("SELECT * FROM bills").all().map(mapBill);
  const payments = db.prepare("SELECT COALESCE(SUM(amount),0) total FROM payments").get().total;
  const unpaid = bills.filter(b => b.status !== "Paid").length;
  const totalBillings = bills.reduce((s,b)=>s + ((Math.max(0, b.present-b.previous) * b.rate) + b.assoc + b.previousAccount), 0);
  res.json({ consumers, unpaid, payments, totalBillings });
});

app.get("/api/consumers", auth, (req, res) => {
  const rows = db.prepare("SELECT id, account_no accountNo, name, address, meter_no meterNo FROM consumers ORDER BY id DESC").all();
  res.json(rows);
});
app.post("/api/consumers", auth, (req, res) => {
  const { accountNo, name, address, meterNo } = req.body;
  const r = db.prepare("INSERT INTO consumers (account_no,name,address,meter_no) VALUES (?,?,?,?)").run(accountNo, name, address, meterNo);
  res.json({ id: r.lastInsertRowid, accountNo, name, address, meterNo });
});
app.delete("/api/consumers/:id", auth, (req,res) => {
  db.prepare("DELETE FROM consumers WHERE id=?").run(req.params.id);
  res.json({ ok:true });
});

app.get("/api/periods", auth, (req,res)=>{
  res.json(db.prepare("SELECT id, period FROM billing_periods ORDER BY id DESC").all());
});
app.post("/api/periods", auth, (req,res)=>{
  const r = db.prepare("INSERT OR IGNORE INTO billing_periods (period) VALUES (?)").run(req.body.period);
  res.json({ id:r.lastInsertRowid, period:req.body.period });
});

app.get("/api/bills", auth, (req,res)=>{
  res.json(db.prepare("SELECT * FROM bills ORDER BY id DESC").all().map(mapBill));
});
app.post("/api/bills", auth, (req,res)=>{
  const b=req.body;
  const r=db.prepare(`INSERT INTO bills
  (period,as_of,account_no,due_date,disconnection_date,name,address,meter_no,period_from,period_to,present,previous,rate,assoc,previous_account,previous_months,receiver,status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.period,b.asOf,b.accountNo,b.dueDate,b.disconnectionDate,b.name,b.address,b.meterNo,b.periodFrom,b.periodTo,b.present,b.previous,b.rate,b.assoc,b.previousAccount,b.previousMonths,b.receiver,b.status||"Unpaid"
  );
  res.json({ ...b, id:r.lastInsertRowid });
});
app.delete("/api/bills/:id", auth, (req,res)=>{
  db.prepare("DELETE FROM bills WHERE id=?").run(req.params.id);
  res.json({ ok:true });
});

app.get("/api/payments", auth, (req,res)=>{
  res.json(db.prepare("SELECT id, account_no accountNo, payment_date date, amount, reference FROM payments ORDER BY id DESC").all());
});
app.post("/api/payments", auth, (req,res)=>{
  const p=req.body;
  const r=db.prepare("INSERT INTO payments (account_no,payment_date,amount,reference) VALUES (?,?,?,?)").run(p.accountNo,p.date,p.amount,p.reference);
  db.prepare("UPDATE bills SET status='Paid' WHERE account_no=?").run(p.accountNo);
  res.json({ ...p, id:r.lastInsertRowid });
});

app.get("/api/business-info", auth, (req,res)=>{
  res.json(db.prepare("SELECT name,address,contact FROM business_info WHERE id=1").get());
});
app.put("/api/business-info", auth, (req,res)=>{
  const i=req.body;
  db.prepare("UPDATE business_info SET name=?, address=?, contact=? WHERE id=1").run(i.name,i.address,i.contact);
  res.json(i);
});

app.get("/api/users", auth, (req,res)=>{
  res.json(db.prepare("SELECT id, username, role, created_at createdAt FROM users ORDER BY id DESC").all());
});
app.post("/api/users", auth, (req,res)=>{
  const { username, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare("INSERT INTO users (username,password_hash,role) VALUES (?,?,?)").run(username, hash, role || "USER");
  res.json({ id:r.lastInsertRowid, username, role: role || "USER" });
});

app.listen(PORT, () => console.log(`WBS backend running on http://localhost:${PORT}`));
