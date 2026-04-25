import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import html2pdf from "html2pdf.js";
import "./styles.css";

const LS = {
  get: (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

const money = (value) => Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const blankSettings = {
  businessName: "Water Billing System",
  subtitle: "Homeowners / Water Service Billing",
  address: "Business address here",
  note: "Please pay on or before the due date to avoid service interruption.",
  authorizedBy: "Authorized Representative",
  officeHours1: "Monday to Friday - Office hours",
  officeHours2: "Saturday - Office hours",
};

function seedData(userKey) {
  const consumersKey = `wbs:${userKey}:consumers`;
  const periodsKey = `wbs:${userKey}:periods`;
  const settingsKey = `wbs:${userKey}:settings`;
  if (!localStorage.getItem(settingsKey)) LS.set(settingsKey, blankSettings);
  if (!localStorage.getItem(consumersKey)) {
    LS.set(consumersKey, [
      { id: crypto.randomUUID(), accountNo: "ACC-001", name: "Sample Consumer A", address: "Sample Block / Lot", meterNo: "MTR-001", status: "Active" },
      { id: crypto.randomUUID(), accountNo: "ACC-002", name: "Sample Consumer B", address: "Sample Street", meterNo: "MTR-002", status: "Active" },
    ]);
  }
  if (!localStorage.getItem(periodsKey)) {
    LS.set(periodsKey, [{ id: crypto.randomUUID(), period: "December 2025", dueDate: nextMonth(), rate: 18.65, assoc: 50 }]);
  }
}

function useTenantData(user) {
  const userKey = user?.toLowerCase().replace(/\s+/g, "-") || "guest";
  const keys = {
    consumers: `wbs:${userKey}:consumers`,
    periods: `wbs:${userKey}:periods`,
    billings: `wbs:${userKey}:billings`,
    payments: `wbs:${userKey}:payments`,
    settings: `wbs:${userKey}:settings`,
  };
  const [consumers, setConsumers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [billings, setBillings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(blankSettings);

  const load = () => {
    seedData(userKey);
    setConsumers(LS.get(keys.consumers));
    setPeriods(LS.get(keys.periods));
    setBillings(LS.get(keys.billings));
    setPayments(LS.get(keys.payments));
    setSettings(LS.get(keys.settings, blankSettings));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const saveConsumers = (data) => { setConsumers(data); LS.set(keys.consumers, data); };
  const savePeriods = (data) => { setPeriods(data); LS.set(keys.periods, data); };
  const saveBillings = (data) => { setBillings(data); LS.set(keys.billings, data); };
  const savePayments = (data) => { setPayments(data); LS.set(keys.payments, data); };
  const saveSettings = (data) => { setSettings(data); LS.set(keys.settings, data); };

  return { consumers, periods, billings, payments, settings, saveConsumers, savePeriods, saveBillings, savePayments, saveSettings, load };
}

function computeBill(row) {
  const previous = Number(row.previousReading || 0);
  const present = Number(row.presentReading || 0);
  const consumption = Math.max(0, present - previous);
  const waterBill = consumption * Number(row.rate || 0);
  const totalDue = waterBill + Number(row.assoc || 0) + Number(row.previousBalance || 0);
  return { consumption, waterBill, totalDue };
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  return (
    <div className="login-page">
      <div className="login-card">
        <h2>WBS Login</h2>
        <p>Multi-user local workspace. Each username has separate data.</p>
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin / collector / user" /></label>
        <button onClick={() => username.trim() && onLogin(username.trim())}>Login</button>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, user }) {
  const items = [
    ["dashboard", "▦", "Dashboard"],
    ["consumer-details", "☷", "Consumer Details"],
    ["consumer-list", "☰", "Consumer List"],
    ["billing-period", "▣", "Billing Period"],
    ["generate-billing", "◈", "Generate Billing"],
    ["billing-list", "▤", "Billing List"],
    ["payment-posting", "₱", "Payment Posting"],
    ["payment-list", "◎", "Payment List"],
    ["reports", "▥", "Reports"],
    ["settings", "⚙", "Settings"],
  ];
  return (
    <aside className="sidebar">
      <div className="userbar"><span className="tree-logo">♧</span><span>{user}</span></div>
      {items.map(([key, icon, label]) => (
        <button key={key} className={`side-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)}>
          <span>{icon}</span><span>{label}</span>
        </button>
      ))}
      <div className="roles"><small>ROLES</small><b>ADMIN</b><small>WBS Version 2.0</small></div>
    </aside>
  );
}

function Topbar({ title, onLogout }) {
  return <div className="topbar"><span>{title}</span><button className="logout" onClick={onLogout}>Logout</button></div>;
}

function Dashboard({ consumers, billings, payments }) {
  const totalBilling = billings.reduce((s, b) => s + computeBill(b).totalDue, 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  return (
    <div className="content-pad page-grid">
      <div className="stat"><b>{consumers.length}</b><span>Consumers</span></div>
      <div className="stat"><b>{billings.length}</b><span>Billings</span></div>
      <div className="stat"><b>₱{money(totalBilling)}</b><span>Total Billing</span></div>
      <div className="stat"><b>₱{money(totalPaid)}</b><span>Total Collection</span></div>
    </div>
  );
}

function ConsumerDetails({ consumers, saveConsumers }) {
  const [form, setForm] = useState({ accountNo: "", name: "", address: "", meterNo: "", status: "Active" });
  const add = () => {
    if (!form.accountNo || !form.name) return alert("Account No. and Name are required");
    saveConsumers([...consumers, { ...form, id: crypto.randomUUID() }]);
    setForm({ accountNo: "", name: "", address: "", meterNo: "", status: "Active" });
  };
  return (
    <div className="content-pad">
      <div className="card">
        <div className="card-head"><h3>Consumer Details</h3></div>
        <div className="form-grid">
          {Object.keys(form).map((k) => (
            <label className="field" key={k}>{k}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
          ))}
        </div>
        <br /><button className="primary" onClick={add}>Save Consumer</button>
      </div>
    </div>
  );
}

function ConsumerList({ consumers, saveConsumers }) {
  const remove = (id) => saveConsumers(consumers.filter((c) => c.id !== id));
  return (
    <div className="content-pad card">
      <h3>Consumer List</h3>
      <table className="data-table"><thead><tr><th>Account</th><th>Name</th><th>Address</th><th>Meter</th><th>Status</th><th></th></tr></thead><tbody>
        {consumers.map((c) => <tr key={c.id}><td>{c.accountNo}</td><td>{c.name}</td><td>{c.address}</td><td>{c.meterNo}</td><td>{c.status}</td><td><button className="mini danger" onClick={() => remove(c.id)}>Delete</button></td></tr>)}
      </tbody></table>
    </div>
  );
}

function BillingPeriod({ periods, savePeriods }) {
  const [form, setForm] = useState({ period: "", dueDate: nextMonth(), rate: 18.65, assoc: 50 });
  const add = () => {
    if (!form.period) return alert("Period is required");
    savePeriods([...periods, { ...form, id: crypto.randomUUID() }]);
    setForm({ period: "", dueDate: nextMonth(), rate: 18.65, assoc: 50 });
  };
  return (
    <div className="content-pad card">
      <h3>Billing Period</h3>
      <div className="form-grid">
        <label className="field">Period Covered<input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="January 2026" /></label>
        <label className="field">Due Date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <label className="field">Rate per cu.m<input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></label>
        <label className="field">Association Dues<input type="number" value={form.assoc} onChange={(e) => setForm({ ...form, assoc: e.target.value })} /></label>
      </div><br />
      <button className="primary" onClick={add}>Add Period</button>
      <table className="data-table"><thead><tr><th>Period</th><th>Due Date</th><th>Rate</th><th>Assoc</th></tr></thead><tbody>{periods.map(p => <tr key={p.id}><td>{p.period}</td><td>{p.dueDate}</td><td>{p.rate}</td><td>{p.assoc}</td></tr>)}</tbody></table>
    </div>
  );
}

function GenerateBilling({ consumers, periods, billings, saveBillings }) {
  const [form, setForm] = useState({ consumerId: "", periodId: "", previousReading: "", presentReading: "", previousBalance: 0 });
  const selectedPeriod = periods.find((p) => p.id === form.periodId);
  const preview = computeBill({ ...form, rate: selectedPeriod?.rate, assoc: selectedPeriod?.assoc });
  const generate = () => {
    const consumer = consumers.find((c) => c.id === form.consumerId);
    if (!consumer || !selectedPeriod) return alert("Select consumer and billing period");
    const row = {
      id: crypto.randomUUID(), consumerId: consumer.id, accountNo: consumer.accountNo, name: consumer.name,
      address: consumer.address, meterNo: consumer.meterNo, period: selectedPeriod.period, dueDate: selectedPeriod.dueDate,
      rate: selectedPeriod.rate, assoc: selectedPeriod.assoc, previousReading: form.previousReading,
      presentReading: form.presentReading, previousBalance: form.previousBalance, status: "Unpaid", createdAt: today(),
    };
    saveBillings([...billings, row]);
    setForm({ consumerId: "", periodId: "", previousReading: "", presentReading: "", previousBalance: 0 });
  };
  return (
    <div className="content-pad card">
      <h3>Generate Billing</h3>
      <div className="form-grid">
        <label className="field">Consumer<select value={form.consumerId} onChange={(e) => setForm({ ...form, consumerId: e.target.value })}><option value="">Select</option>{consumers.map(c => <option key={c.id} value={c.id}>{c.accountNo} - {c.name}</option>)}</select></label>
        <label className="field">Period<select value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}><option value="">Select</option>{periods.map(p => <option key={p.id} value={p.id}>{p.period}</option>)}</select></label>
        <label className="field">Previous Reading<input type="number" value={form.previousReading} onChange={(e) => setForm({ ...form, previousReading: e.target.value })} /></label>
        <label className="field">Present Reading<input type="number" value={form.presentReading} onChange={(e) => setForm({ ...form, presentReading: e.target.value })} /></label>
        <label className="field">Previous Balance<input type="number" value={form.previousBalance} onChange={(e) => setForm({ ...form, previousBalance: e.target.value })} /></label>
      </div>
      <p className="muted">Consumption: {preview.consumption} cu.m | Water Bill: ₱{money(preview.waterBill)} | Total Due: ₱{money(preview.totalDue)}</p>
      <button className="primary" onClick={generate}>Generate Billing</button>
    </div>
  );
}

function BillNotice({ bill, settings, onClose }) {
  if (!bill) return null;
  const c = computeBill(bill);
  const download = () => html2pdf().set({ margin: 8, filename: `${bill.accountNo}-${bill.period}.pdf` }).from(document.querySelector(".paper")).save();
  return (
    <div className="modal-backdrop">
      <div className="notice-modal">
        <div className="notice-toolbar"><b>Billing Notice Preview</b><div><button onClick={download}>Download PDF</button><button onClick={onClose}>Close</button></div></div>
        <div className="paper">
          <div className="red-note">NOTE: PLEASE PAY IMMEDIATELY TO AVOID DISCONNECTION</div>
          <div className="hoa-title"><b>{settings.businessName}</b><small>{settings.subtitle}<br />{settings.address}</small></div>
          <table className="bill-table"><tbody>
            <tr><td>As of</td><td>{bill.createdAt}</td><td className="cyan">Account No.</td><td>{bill.accountNo}</td><td>Due Date</td><td className="yellow">{bill.dueDate}</td></tr>
            <tr><td colSpan="2">Consumer</td><td colSpan="2">{bill.name}</td><td>Meter Number</td><td>{bill.meterNo}</td></tr>
            <tr><td colSpan="2">Address</td><td colSpan="4">{bill.address}</td></tr>
            <tr><td rowSpan="5" colSpan="2" className="meter-photo">Meter / Photo Area<br /><div className="fake-meter">m³</div></td><td>Period Covered</td><td>{bill.period}</td><td>Previous Reading</td><td>{bill.previousReading}</td></tr>
            <tr><td>Present Reading</td><td>{bill.presentReading}</td><td>Consumption per cu.m</td><td className="rednum">{c.consumption}</td></tr>
            <tr><td>Water Bill for the Month</td><td colSpan="3" className="right">₱{money(c.waterBill)}</td></tr>
            <tr><td>Previous Month's Account</td><td colSpan="3" className="right">₱{money(bill.previousBalance)}</td></tr>
            <tr><td className="cyan">Total Water Bill</td><td colSpan="3" className="right cyan">₱{money(c.waterBill + Number(bill.previousBalance || 0))}</td></tr>
            <tr><td colSpan="2">Association Dues for the Month</td><td colSpan="4" className="right">₱{money(bill.assoc)}</td></tr>
            <tr><td colSpan="2" className="pink redtext">Total Monthly Due</td><td colSpan="4" className="right pink redtext big">₱{money(c.totalDue)}</td></tr>
            <tr><td colSpan="2" className="green-bg"><b>Grand Total Due</b></td><td colSpan="4" className="right green-bg big"><b>₱{money(c.totalDue)}</b></td></tr>
          </tbody></table>
          <div className="authorized">AS AUTHORIZED, ALL PAYMENTS SHALL BE RECEIVED BY {settings.authorizedBy}</div>
          <table className="schedule"><tbody><tr><td>{settings.officeHours1}</td></tr><tr><td>{settings.officeHours2}</td></tr><tr><td>{settings.note}</td></tr></tbody></table>
        </div>
      </div>
    </div>
  );
}

function BillingList({ billings, saveBillings, settings }) {
  const [preview, setPreview] = useState(null);
  const remove = (id) => saveBillings(billings.filter((b) => b.id !== id));
  return (
    <div className="content-pad card">
      <h3>Billing List</h3>
      <table className="data-table"><thead><tr><th>Period</th><th>Account</th><th>Name</th><th>Total Due</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {billings.map((b) => <tr key={b.id}><td>{b.period}</td><td>{b.accountNo}</td><td>{b.name}</td><td>₱{money(computeBill(b).totalDue)}</td><td>{b.status}</td><td className="row-actions"><button className="mini" onClick={() => setPreview(b)}>View / PDF</button><button className="mini danger" onClick={() => remove(b.id)}>Delete</button></td></tr>)}
      </tbody></table>
      <BillNotice bill={preview} settings={settings} onClose={() => setPreview(null)} />
    </div>
  );
}

function PaymentPosting({ billings, saveBillings, payments, savePayments }) {
  const [billingId, setBillingId] = useState("");
  const [amount, setAmount] = useState("");
  const post = () => {
    const bill = billings.find((b) => b.id === billingId);
    if (!bill || !amount) return alert("Select billing and enter amount");
    const payment = { id: crypto.randomUUID(), billingId, accountNo: bill.accountNo, name: bill.name, period: bill.period, amount, paymentDate: today() };
    savePayments([...payments, payment]);
    saveBillings(billings.map((b) => b.id === billingId ? { ...b, status: Number(amount) >= computeBill(b).totalDue ? "Paid" : "Partial" } : b));
    setBillingId(""); setAmount("");
  };
  return <div className="content-pad card"><h3>Payment Posting</h3><div className="inline-form"><label className="field">Billing<select value={billingId} onChange={(e) => setBillingId(e.target.value)}><option value="">Select</option>{billings.map(b => <option key={b.id} value={b.id}>{b.accountNo} - {b.name} - ₱{money(computeBill(b).totalDue)}</option>)}</select></label><label className="field">Amount<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><button className="primary" onClick={post}>Post Payment</button></div></div>;
}

function PaymentList({ payments }) {
  return <div className="content-pad card"><h3>Payment List</h3><table className="data-table"><thead><tr><th>Date</th><th>Account</th><th>Name</th><th>Period</th><th>Amount</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.paymentDate}</td><td>{p.accountNo}</td><td>{p.name}</td><td>{p.period}</td><td>₱{money(p.amount)}</td></tr>)}</tbody></table></div>;
}

function Reports({ billings, payments }) {
  const [open, setOpen] = useState("monthly");
  const periods = [...new Set(billings.map((b) => b.period))];
  const [period, setPeriod] = useState(periods[0] || "");
  const periodBills = billings.filter((b) => !period || b.period === period);
  const unpaid = periodBills.filter((b) => b.status !== "Paid");
  const total = periodBills.reduce((s, b) => s + computeBill(b).totalDue, 0);
  const collections = payments.reduce((m, p) => { m[p.paymentDate] = (m[p.paymentDate] || 0) + Number(p.amount || 0); return m; }, {});
  const Section = ({ id, title, children }) => <div className="acc"><button className="acc-head" onClick={() => setOpen(open === id ? null : id)}>{title}</button>{open === id && <div className="acc-body">{children}</div>}</div>;
  return (
    <div className="report-shell">
      <Section id="daily" title="Daily Payment Collection Report"><table className="data-table"><tbody>{Object.entries(collections).map(([d, a]) => <tr key={d}><td>{d}</td><td>₱{money(a)}</td></tr>)}</tbody></table></Section>
      <Section id="outstanding" title="Consumer With Outstanding Billing Report"><table className="data-table"><tbody>{unpaid.map(b => <tr key={b.id}><td>{b.name}</td><td>{b.period}</td><td>₱{money(computeBill(b).totalDue)}</td></tr>)}</tbody></table></Section>
      <Section id="detailed" title="Detailed Summary Report"><table className="data-table"><tbody>{periodBills.map(b => <tr key={b.id}><td>{b.accountNo}</td><td>{b.name}</td><td>{computeBill(b).consumption} cu.m</td><td>₱{money(computeBill(b).totalDue)}</td></tr>)}</tbody></table></Section>
      <Section id="monthly" title="Monthly Billing Summary Report"><div className="monthly-box"><label className="period-label">Period Covered</label><div className="monthly-row"><select value={period} onChange={(e) => setPeriod(e.target.value)}>{periods.map(p => <option key={p}>{p}</option>)}</select><label className="showpay"><input type="checkbox" /> Show Payment</label></div><h3>Billing Summary Report</h3><p>Total Billings: ₱{money(total)}</p><p>Number of Bills: {periodBills.length}</p></div></Section>
    </div>
  );
}

function Settings({ settings, saveSettings }) {
  return <div className="content-pad card"><h3>Business Info / Settings</h3><div className="form-grid">{Object.keys(settings).map(k => <label className="field" key={k}>{k}<input value={settings[k]} onChange={(e) => saveSettings({ ...settings, [k]: e.target.value })} /></label>)}</div></div>;
}

const titleMap = {
  dashboard: "DASHBOARD",
  "consumer-details": "CONSUMER MANAGEMENT",
  "consumer-list": "CONSUMER LIST",
  "billing-period": "BILLING PERIOD",
  "generate-billing": "GENERATE BILLING",
  "billing-list": "BILLING LIST",
  "payment-posting": "PAYMENT POSTING",
  "payment-list": "PAYMENT LIST",
  reports: "REPORT MANAGEMENT",
  settings: "SETTINGS",
};

function App() {
  const [user, setUser] = useState(localStorage.getItem("wbs:lastUser") || null);
  const [page, setPage] = useState("reports");
  const data = useTenantData(user);
  const login = (u) => { localStorage.setItem("wbs:lastUser", u); setUser(u); };
  const logout = () => { localStorage.removeItem("wbs:lastUser"); setUser(null); };
  if (!user) return <Login onLogin={login} />;
  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} user={user} />
      <main className="main">
        <Topbar title={titleMap[page]} onLogout={logout} />
        {page === "dashboard" && <Dashboard {...data} />}
        {page === "consumer-details" && <ConsumerDetails {...data} />}
        {page === "consumer-list" && <ConsumerList {...data} />}
        {page === "billing-period" && <BillingPeriod {...data} />}
        {page === "generate-billing" && <GenerateBilling {...data} />}
        {page === "billing-list" && <BillingList {...data} />}
        {page === "payment-posting" && <PaymentPosting {...data} />}
        {page === "payment-list" && <PaymentList {...data} />}
        {page === "reports" && <Reports {...data} />}
        {page === "settings" && <Settings {...data} />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
