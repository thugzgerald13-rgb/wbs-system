import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import html2pdf from "html2pdf.js";
import "./styles.css";

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const money = (n) => Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
const today = () => new Date().toISOString().slice(0, 10);
const defaultSettings = {
  businessName: "Water Billing System",
  subtitle: "Homeowners / Water Billing Management",
  address: "Business address here",
  collector: "Authorized Collector",
  note: "Please pay on or before the due date to avoid disconnection.",
  weekday: "Monday to Friday - 8:00 AM to 5:00 PM",
  saturday: "Saturday - 8:00 AM to 12:00 NN"
};

function initialData() {
  return {
    settings: defaultSettings,
    users: [{ id: uid(), name: "Admin", role: "ADMIN" }],
    consumers: [
      { id: uid(), accountNo: "ACC-001", name: "Sample Consumer", address: "Sample Address", meterNo: "MTR-001", status: "Active" }
    ],
    periods: [{ id: uid(), period: "December 2025", dueDate: "2026-01-10", rate: 18.65, assoc: 50 }],
    bills: [],
    payments: [],
    conversions: [{ id: uid(), label: "Water Rate per cu.m", value: 18.65 }, { id: uid(), label: "Default Association Due", value: 50 }]
  };
}

function computeBill(bill) {
  const previous = Number(bill.previousReading || 0);
  const present = Number(bill.presentReading || 0);
  const consumption = Math.max(0, present - previous);
  const water = consumption * Number(bill.rate || 0);
  const total = water + Number(bill.assoc || 0) + Number(bill.previousBalance || 0);
  return { consumption, water, total };
}

function Login({ onLogin }) {
  const [name, setName] = useState("");
  return <div className="login-page"><div className="login-card"><h2>WBS Login</h2><p>Enter a workspace username. Each username keeps its own data.</p><label>Username<input value={name} onChange={e => setName(e.target.value)} placeholder="admin" /></label><button onClick={() => name.trim() && onLogin(name.trim())}>LOGIN</button></div></div>;
}

function SideButton({ active, icon, label, onClick, sub }) {
  return <button className={`${sub ? "side-sub" : "side-item"} ${active ? "active" : ""}`} onClick={onClick}><span className="side-icon">{icon}</span><span>{label}</span></button>;
}

function Sidebar({ page, setPage, user }) {
  return <aside className="sidebar">
    <div className="profile"><div className="logo">♣</div><span>{user}</span><b>‹</b></div>
    <SideButton active={page === "dashboard"} icon="▦" label="Dashboard" onClick={() => setPage("dashboard")} />
    <div className="side-group"><div className="side-title"><span>👥</span>Consumer <b>⌃</b></div><SideButton sub active={page === "consumer-details"} icon="☷" label="Consumer Details" onClick={() => setPage("consumer-details")} /><SideButton sub active={page === "consumer-list"} icon="☰" label="Consumer List" onClick={() => setPage("consumer-list")} /></div>
    <div className="side-group"><div className="side-title"><span>💧</span>Billings <b>⌃</b></div><SideButton sub active={page === "billing-period"} icon="▣" label="Billing Period" onClick={() => setPage("billing-period")} /><SideButton sub active={page === "generate-billing"} icon="◈" label="Generate Billing" onClick={() => setPage("generate-billing")} /><SideButton sub active={page === "billing-list"} icon="▤" label="Billing List" onClick={() => setPage("billing-list")} /></div>
    <div className="side-group"><div className="side-title"><span>₱</span>Payments <b>⌃</b></div><SideButton sub active={page === "payment-posting"} icon="◎" label="Payment Posting" onClick={() => setPage("payment-posting")} /><SideButton sub active={page === "payment-list"} icon="◉" label="Payment List" onClick={() => setPage("payment-list")} /></div>
    <SideButton active={page === "reports"} icon="▥" label="Reports" onClick={() => setPage("reports")} />
    <div className="side-group"><div className="side-title"><span>⚙</span>Settings <b>⌃</b></div><SideButton sub active={page === "users"} icon="♙" label="Users" onClick={() => setPage("users")} /><SideButton sub active={page === "business-info"} icon="▥" label="Business Info" onClick={() => setPage("business-info")} /><SideButton sub active={page === "conversion-table"} icon="▦" label="Conversion Table" onClick={() => setPage("conversion-table")} /><SideButton sub active={page === "other"} icon="⚙" label="Other" onClick={() => setPage("other")} /></div>
    <div className="roles"><small>ROLES</small><b>ADMIN</b><small>WBS Version 2.2</small></div>
  </aside>;
}

function Topbar({ title, onLogout }) { return <div className="topbar"><span>{title}</span><button onClick={onLogout}>Logout</button></div>; }
function Page({ title, children }) { return <section className="content-pad"><div className="card"><h3>{title}</h3>{children}</div></section>; }
function Input({ label, value, onChange, type = "text" }) { return <label className="field">{label}<input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} /></label>; }
function Select({ label, value, onChange, children }) { return <label className="field">{label}<select value={value ?? ""} onChange={e => onChange(e.target.value)}>{children}</select></label>; }

function Dashboard({ data, setPage }) {
  const totalBill = data.bills.reduce((s, b) => s + computeBill(b).total, 0);
  const totalPay = data.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  return <div className="content-pad"><div className="dash-grid"><button onClick={() => setPage("consumer-list")} className="stat"><b>{data.consumers.length}</b><span>Consumers</span></button><button onClick={() => setPage("billing-list")} className="stat"><b>{data.bills.length}</b><span>Billings</span></button><button onClick={() => setPage("reports")} className="stat"><b>₱{money(totalBill)}</b><span>Total Billings</span></button><button onClick={() => setPage("payment-list")} className="stat"><b>₱{money(totalPay)}</b><span>Payments</span></button></div><div className="card"><h3>Quick Actions</h3><div className="actions"><button onClick={() => setPage("consumer-details")}>Add Consumer</button><button onClick={() => setPage("generate-billing")}>Generate Billing</button><button onClick={() => setPage("payment-posting")}>Post Payment</button><button onClick={() => setPage("reports")}>Open Reports</button></div></div></div>;
}

function ConsumerDetails({ data, update }) {
  const [form, setForm] = useState({ accountNo: "", name: "", address: "", meterNo: "", status: "Active" });
  const save = () => { if (!form.accountNo || !form.name) return alert("Account No. and Consumer Name are required."); update({ consumers: [...data.consumers, { ...form, id: uid() }] }); setForm({ accountNo: "", name: "", address: "", meterNo: "", status: "Active" }); };
  return <Page title="Consumer Details"><div className="form-grid"><Input label="Account No." value={form.accountNo} onChange={v => setForm({ ...form, accountNo: v })} /><Input label="Consumer Name" value={form.name} onChange={v => setForm({ ...form, name: v })} /><Input label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} /><Input label="Meter No." value={form.meterNo} onChange={v => setForm({ ...form, meterNo: v })} /><Input label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} /></div><button className="primary" onClick={save}>Save Consumer</button></Page>;
}

function ConsumerList({ data, update }) { return <Page title="Consumer List"><table className="data-table"><thead><tr><th>Account No.</th><th>Name</th><th>Address</th><th>Meter No.</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.consumers.map(c => <tr key={c.id}><td>{c.accountNo}</td><td>{c.name}</td><td>{c.address}</td><td>{c.meterNo}</td><td>{c.status}</td><td><button className="mini danger" onClick={() => update({ consumers: data.consumers.filter(x => x.id !== c.id) })}>Delete</button></td></tr>)}</tbody></table></Page>; }

function BillingPeriod({ data, update }) {
  const [form, setForm] = useState({ period: "", dueDate: "", rate: "", assoc: "" });
  const save = () => { if (!form.period) return alert("Billing period is required."); update({ periods: [...data.periods, { ...form, id: uid() }] }); setForm({ period: "", dueDate: "", rate: "", assoc: "" }); };
  return <Page title="Billing Period"><div className="form-grid"><Input label="Period Covered" value={form.period} onChange={v => setForm({ ...form, period: v })} /><Input type="date" label="Due Date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} /><Input type="number" label="Rate per cu.m" value={form.rate} onChange={v => setForm({ ...form, rate: v })} /><Input type="number" label="Association Due" value={form.assoc} onChange={v => setForm({ ...form, assoc: v })} /></div><button className="primary" onClick={save}>Add Billing Period</button><table className="data-table"><thead><tr><th>Period</th><th>Due Date</th><th>Rate</th><th>Association Due</th></tr></thead><tbody>{data.periods.map(p => <tr key={p.id}><td>{p.period}</td><td>{p.dueDate}</td><td>{p.rate}</td><td>{p.assoc}</td></tr>)}</tbody></table></Page>;
}

function GenerateBilling({ data, update }) {
  const [form, setForm] = useState({ consumerId: "", periodId: "", previousReading: "", presentReading: "", previousBalance: 0 });
  const consumer = data.consumers.find(c => c.id === form.consumerId); const period = data.periods.find(p => p.id === form.periodId);
  const preview = computeBill({ ...form, rate: period?.rate, assoc: period?.assoc });
  const generate = () => { if (!consumer || !period) return alert("Select consumer and billing period."); const bill = { id: uid(), consumerId: consumer.id, accountNo: consumer.accountNo, name: consumer.name, address: consumer.address, meterNo: consumer.meterNo, period: period.period, dueDate: period.dueDate, rate: period.rate, assoc: period.assoc, previousReading: form.previousReading, presentReading: form.presentReading, previousBalance: form.previousBalance, status: "Unpaid", createdAt: today() }; update({ bills: [...data.bills, bill] }); setForm({ consumerId: "", periodId: "", previousReading: "", presentReading: "", previousBalance: 0 }); };
  return <Page title="Generate Billing"><div className="form-grid"><Select label="Consumer" value={form.consumerId} onChange={v => setForm({ ...form, consumerId: v })}><option value="">Select consumer</option>{data.consumers.map(c => <option key={c.id} value={c.id}>{c.accountNo} - {c.name}</option>)}</Select><Select label="Billing Period" value={form.periodId} onChange={v => setForm({ ...form, periodId: v })}><option value="">Select period</option>{data.periods.map(p => <option key={p.id} value={p.id}>{p.period}</option>)}</Select><Input type="number" label="Previous Reading" value={form.previousReading} onChange={v => setForm({ ...form, previousReading: v })} /><Input type="number" label="Present Reading" value={form.presentReading} onChange={v => setForm({ ...form, presentReading: v })} /><Input type="number" label="Previous Balance" value={form.previousBalance} onChange={v => setForm({ ...form, previousBalance: v })} /></div><div className="summary-line">Consumption: <b>{preview.consumption}</b> cu.m | Water Bill: <b>₱{money(preview.water)}</b> | Total Due: <b>₱{money(preview.total)}</b></div><button className="primary" onClick={generate}>Generate Billing</button></Page>;
}

function Notice({ bill, settings, close }) {
  if (!bill) return null; const c = computeBill(bill); const pdf = () => html2pdf().set({ margin: 6, filename: `${bill.accountNo}-${bill.period}.pdf` }).from(document.querySelector(".paper")).save();
  return <div className="modal-backdrop"><div className="notice-modal"><div className="notice-toolbar"><b>Generated Billing Notice</b><div><button onClick={pdf}>Download PDF</button><button onClick={close}>Close</button></div></div><div className="paper"><div className="red-note">NOTE: PLEASE PAY IMMEDIATELY TO AVOID DISCONNECTION</div><div className="hoa-title"><b>{settings.businessName}</b><small>{settings.subtitle}<br />{settings.address}</small></div><table className="bill-table"><tbody><tr><td>As of</td><td>{bill.createdAt}</td><td className="cyan">Account No.</td><td>{bill.accountNo}</td><td>Due Date</td><td className="yellow">{bill.dueDate}</td></tr><tr><td colSpan="2">Consumer</td><td colSpan="4">{bill.name}</td></tr><tr><td colSpan="2">Address</td><td colSpan="4">{bill.address}</td></tr><tr><td rowSpan="5" colSpan="2" className="meter-photo">Meter Photo Area<div className="fake-meter">m³</div></td><td>Period Covered</td><td>{bill.period}</td><td>Meter Number</td><td>{bill.meterNo}</td></tr><tr><td>Previous Reading</td><td>{bill.previousReading}</td><td>Present Reading</td><td>{bill.presentReading}</td></tr><tr><td>Consumption per cu.m</td><td className="rednum">{c.consumption}</td><td>Water Bill</td><td className="right">₱{money(c.water)}</td></tr><tr><td>Previous Balance</td><td colSpan="3" className="right">₱{money(bill.previousBalance)}</td></tr><tr><td className="cyan">Total Water Bill</td><td colSpan="3" className="right cyan">₱{money(c.water + Number(bill.previousBalance || 0))}</td></tr><tr><td colSpan="2">Association Due</td><td colSpan="4" className="right">₱{money(bill.assoc)}</td></tr><tr><td colSpan="2" className="pink redtext">Total Monthly Due</td><td colSpan="4" className="right pink redtext big">₱{money(c.total)}</td></tr><tr><td colSpan="2" className="green-bg"><b>Grand Total Due</b></td><td colSpan="4" className="right green-bg big"><b>₱{money(c.total)}</b></td></tr></tbody></table><div className="authorized">AS AUTHORIZED, ALL PAYMENTS SHALL BE RECEIVED BY {settings.collector}</div><table className="schedule"><tbody><tr><td>{settings.weekday}</td></tr><tr><td>{settings.saturday}</td></tr><tr><td>{settings.note}</td></tr></tbody></table></div></div></div>;
}

function BillingList({ data, update }) { const [bill, setBill] = useState(null); return <Page title="Billing List"><table className="data-table"><thead><tr><th>Period</th><th>Account</th><th>Name</th><th>Total Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.bills.map(b => <tr key={b.id}><td>{b.period}</td><td>{b.accountNo}</td><td>{b.name}</td><td>₱{money(computeBill(b).total)}</td><td>{b.status}</td><td className="row-actions"><button className="mini" onClick={() => setBill(b)}>Generate Report</button><button className="mini danger" onClick={() => update({ bills: data.bills.filter(x => x.id !== b.id) })}>Delete</button></td></tr>)}</tbody></table><Notice bill={bill} settings={data.settings} close={() => setBill(null)} /></Page>; }

function PaymentPosting({ data, update }) { const [billingId, setBillingId] = useState(""); const [amount, setAmount] = useState(""); const post = () => { const bill = data.bills.find(b => b.id === billingId); if (!bill || !amount) return alert("Select billing and enter payment amount."); const payment = { id: uid(), billingId, accountNo: bill.accountNo, name: bill.name, period: bill.period, amount, paymentDate: today() }; update({ payments: [...data.payments, payment], bills: data.bills.map(b => b.id === billingId ? { ...b, status: Number(amount) >= computeBill(b).total ? "Paid" : "Partial" } : b) }); setBillingId(""); setAmount(""); }; return <Page title="Payment Posting"><div className="inline-form"><Select label="Billing" value={billingId} onChange={setBillingId}><option value="">Select billing</option>{data.bills.map(b => <option key={b.id} value={b.id}>{b.accountNo} - {b.name} - ₱{money(computeBill(b).total)}</option>)}</Select><Input type="number" label="Payment Amount" value={amount} onChange={setAmount} /><button className="primary" onClick={post}>Post Payment</button></div></Page>; }
function PaymentList({ data }) { return <Page title="Payment List"><table className="data-table"><thead><tr><th>Date</th><th>Account</th><th>Name</th><th>Period</th><th>Amount</th></tr></thead><tbody>{data.payments.map(p => <tr key={p.id}><td>{p.paymentDate}</td><td>{p.accountNo}</td><td>{p.name}</td><td>{p.period}</td><td>₱{money(p.amount)}</td></tr>)}</tbody></table></Page>; }

function Reports({ data }) {
  const [open, setOpen] = useState("monthly"); const periods = [...new Set(data.bills.map(b => b.period))]; const [period, setPeriod] = useState(periods[0] || ""); const bills = data.bills.filter(b => !period || b.period === period); const unpaid = bills.filter(b => b.status !== "Paid"); const collections = data.payments.reduce((a, p) => ({ ...a, [p.paymentDate]: (a[p.paymentDate] || 0) + Number(p.amount || 0) }), {}); const total = bills.reduce((s, b) => s + computeBill(b).total, 0);
  const Acc = ({ id, title, children }) => <div className="acc"><button className="acc-head" onClick={() => setOpen(open === id ? "" : id)}>{title}</button>{open === id && <div className="acc-body">{children}</div>}</div>;
  return <div className="report-shell"><Acc id="daily" title="Daily Payment Collection Report"><table className="data-table"><tbody>{Object.entries(collections).map(([d, amt]) => <tr key={d}><td>{d}</td><td>₱{money(amt)}</td></tr>)}</tbody></table></Acc><Acc id="outstanding" title="Consumer With Outstanding Billing Report"><table className="data-table"><tbody>{unpaid.map(b => <tr key={b.id}><td>{b.accountNo}</td><td>{b.name}</td><td>₱{money(computeBill(b).total)}</td></tr>)}</tbody></table></Acc><Acc id="detailed" title="Detailed Summary Report"><table className="data-table"><tbody>{bills.map(b => <tr key={b.id}><td>{b.accountNo}</td><td>{b.name}</td><td>{computeBill(b).consumption} cu.m</td><td>₱{money(computeBill(b).total)}</td></tr>)}</tbody></table></Acc><Acc id="monthly" title="Monthly Billing Summary Report"><div className="monthly-row"><label><span>Period Covered</span><select value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p}>{p}</option>)}</select></label><label className="showpay"><input type="checkbox" /> Show Payment</label></div><div className="billing-report-title">Billing Summary Report</div><div className="summary-line">Number of Bills: <b>{bills.length}</b> | Total Billing: <b>₱{money(total)}</b></div></Acc></div>;
}

function Users({ data, update }) { const [name, setName] = useState(""); return <Page title="Users"><div className="inline-form"><Input label="User Name" value={name} onChange={setName} /><button className="primary" onClick={() => name && (update({ users: [...data.users, { id: uid(), name, role: "USER" }] }), setName(""))}>Add User</button></div><table className="data-table"><tbody>{data.users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.role}</td></tr>)}</tbody></table></Page>; }
function BusinessInfo({ data, update }) { const change = (k, v) => update({ settings: { ...data.settings, [k]: v } }); return <Page title="Business Info"><div className="form-grid">{Object.keys(data.settings).map(k => <Input key={k} label={k} value={data.settings[k]} onChange={v => change(k, v)} />)}</div></Page>; }
function ConversionTable({ data, update }) { const [label, setLabel] = useState(""); const [value, setValue] = useState(""); return <Page title="Conversion Table"><div className="inline-form"><Input label="Label" value={label} onChange={setLabel} /><Input label="Value" value={value} onChange={setValue} /><button className="primary" onClick={() => label && (update({ conversions: [...data.conversions, { id: uid(), label, value }] }), setLabel(""), setValue(""))}>Add</button></div><table className="data-table"><tbody>{data.conversions.map(c => <tr key={c.id}><td>{c.label}</td><td>{c.value}</td></tr>)}</tbody></table></Page>; }
function Other({ data, update }) { return <Page title="Other Settings"><div className="actions"><button onClick={() => navigator.clipboard?.writeText(JSON.stringify(data, null, 2))}>Copy Backup JSON</button><button className="danger" onClick={() => confirm("Clear all workspace data?") && update(initialData())}>Reset Workspace</button></div></Page>; }

const titles = { dashboard: "DASHBOARD", "consumer-details": "CONSUMER MANAGEMENT", "consumer-list": "CONSUMER LIST", "billing-period": "BILLING PERIOD", "generate-billing": "GENERATE BILLING", "billing-list": "BILLING LIST", "payment-posting": "PAYMENT POSTING", "payment-list": "PAYMENT LIST", reports: "REPORT MANAGEMENT", users: "USER MANAGEMENT", "business-info": "BUSINESS INFO", "conversion-table": "CONVERSION TABLE", other: "OTHER SETTINGS" };

function App() {
  const [user, setUser] = useState(localStorage.getItem("wbs-user") || ""); const key = `wbs-data-${user || "guest"}`; const [page, setPage] = useState("reports"); const [data, setData] = useState(initialData());
  useEffect(() => { if (user) setData(store.get(key, initialData())); }, [user]);
  const update = (patch) => { const next = { ...data, ...patch }; setData(next); store.set(key, next); };
  const login = (u) => { localStorage.setItem("wbs-user", u); setUser(u); };
  const logout = () => { localStorage.removeItem("wbs-user"); setUser(""); };
  if (!user) return <Login onLogin={login} />;
  return <div className="app"><Sidebar page={page} setPage={setPage} user={user} /><main className="main"><Topbar title={titles[page]} onLogout={logout} />{page === "dashboard" && <Dashboard data={data} setPage={setPage} />}{page === "consumer-details" && <ConsumerDetails data={data} update={update} />}{page === "consumer-list" && <ConsumerList data={data} update={update} />}{page === "billing-period" && <BillingPeriod data={data} update={update} />}{page === "generate-billing" && <GenerateBilling data={data} update={update} />}{page === "billing-list" && <BillingList data={data} update={update} />}{page === "payment-posting" && <PaymentPosting data={data} update={update} />}{page === "payment-list" && <PaymentList data={data} />}{page === "reports" && <Reports data={data} />}{page === "users" && <Users data={data} update={update} />}{page === "business-info" && <BusinessInfo data={data} update={update} />}{page === "conversion-table" && <ConversionTable data={data} update={update} />}{page === "other" && <Other data={data} update={update} />}</main></div>;
}

createRoot(document.getElementById("root")).render(<App />);
