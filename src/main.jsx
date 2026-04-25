import { supabase } from "./supabase";
import { exportPDF } from "./utils/pdf";
import { exportToExcel } from "./utils/exportExcel";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Users, UserPlus, List, Droplet, CalendarDays, ClipboardList,
  CircleDollarSign, BarChart3, Settings, Building2, Table2, ChevronUp, ChevronDown,
  Menu, Printer, FileText, X, Save, Plus, Trash2, LogOut
} from "lucide-react";
import "./styles.css";

const money = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function saveCache(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function loadCache(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } }
function fmtDate(v) { const d = new Date(v); return isNaN(d) ? (v || "") : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }); }
function longDate(v) { const d = new Date(v); return isNaN(d) ? (v || "") : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
function calcBill(b) { const consumption = Math.max(0, Number(b.present || 0) - Number(b.previous || 0)); const water = +(consumption * Number(b.rate || 0)).toFixed(2); return { consumption, water, total: water + Number(b.assoc || 0) + Number(b.previousAccount || 0) }; }

function toConsumer(row) { return { id: row.id, accountNo: row.account_no || "", name: row.name || "", address: row.address || "", meterNo: row.meter_no || "" }; }
function toBill(row) {
  return {
    id: row.id,
    period: row.period || "",
    asOf: row.as_of || "",
    accountNo: row.account_no || "",
    dueDate: row.due_date || "",
    disconnectionDate: row.disconnection_date || "",
    name: row.name || "",
    address: row.address || "",
    meterNo: row.meter_no || "",
    periodFrom: row.period_from || "",
    periodTo: row.period_to || "",
    present: Number(row.present || 0),
    previous: Number(row.previous || 0),
    rate: Number(row.rate || 0),
    assoc: Number(row.assoc || 0),
    previousAccount: Number(row.previous_account || 0),
    previousMonths: row.previous_months || "",
    receiver: row.receiver || "ROCHELLE ZORILLA",
    status: row.status || "Unpaid"
  };
}
function toPayment(row) { return { id: row.id, accountNo: row.account_no || "", date: row.payment_date || "", amount: Number(row.amount || 0), reference: row.reference || "" }; }

const sampleBill = {
  period: "December, 2025", asOf: "2025-12-24", accountNo: "HH00-208", dueDate: "2026-01-05", disconnectionDate: "2026-01-11",
  name: "Bloomingline Trucking/Hauling (Pecson)", address: "Blk 3, Lot 3 Fr., Masi St.", meterNo: "22-005841",
  periodFrom: "2025-11-25", periodTo: "2025-12-24", present: 961, previous: 941, rate: 18.65, assoc: 50,
  previousAccount: 13043, previousMonths: "May. 2025, Jul. 2025, Jun.", receiver: "ROCHELLE ZORILLA", status: "Unpaid"
};

function Login({ setAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = data.session || (await supabase.auth.getSession()).data.session;
      if (!session && isSignup) {
        setError("Account created. If email confirmation is enabled, confirm your email first, then log in.");
        return;
      }
      setAuth({ session, user: session?.user || data.user });
      if (session?.user || data.user) localStorage.setItem("wbs-user", JSON.stringify(session?.user || data.user));
    } catch (err) { setError(err.message); }
  }

  return <div className="login-page">
    <form className="login-card" onSubmit={submit}>
      <h2>WBS Billing System</h2>
      <p>Vercel + Supabase</p>
      {error && <div className="error">{error}</div>}
      <label>Email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button>{isSignup ? "Create Account" : "Login"}</button>
      <small><button type="button" className="linkbtn" onClick={() => setIsSignup(!isSignup)}>{isSignup ? "Already have an account? Login" : "Need an account? Sign up"}</button></small>
    </form>
  </div>;
}

function Sidebar({ page, setPage }) {
  const [open, setOpen] = useState({ consumer: true, billings: true, payments: true, settings: true });
  const Item = ({ id, icon, text, indent = false }) => <button className={indent ? (page === id ? "side-sub active" : "side-sub") : (page === id ? "side-item active" : "side-item")} onClick={() => setPage(id)}>{icon}<span>{text}</span></button>;
  const Group = ({ k, icon, text, children }) => <><button className="side-item group" onClick={() => setOpen({ ...open, [k]: !open[k] })}>{icon}<span>{text}</span>{open[k] ? <ChevronUp size={16} className="chev" /> : <ChevronDown size={16} className="chev" />}</button>{open[k] && children}</>;
  return <aside className="sidebar">
    <div className="userbar"><div className="tree-logo">🌳</div><span>rochelle zorilla</span><ChevronDown size={15} /></div>
    <Item id="dashboard" icon={<LayoutDashboard size={19} />} text="Dashboard" />
    <Group k="consumer" icon={<Users size={19} />} text="Consumer"><Item indent id="consumerDetails" icon={<UserPlus size={17} />} text="Consumer Details" /><Item indent id="consumerList" icon={<List size={17} />} text="Consumer List" /></Group>
    <Group k="billings" icon={<Droplet size={19} />} text="Billings"><Item indent id="billingPeriod" icon={<CalendarDays size={17} />} text="Billing Period" /><Item indent id="generateBilling" icon={<Droplet size={17} />} text="Generate Billing" /><Item indent id="billingList" icon={<ClipboardList size={17} />} text="Billing List" /></Group>
    <Group k="payments" icon={<CircleDollarSign size={19} />} text="Payments"><Item indent id="paymentPosting" icon={<CircleDollarSign size={17} />} text="Payment Posting" /><Item indent id="paymentList" icon={<CircleDollarSign size={17} />} text="Payment List" /></Group>
    <Item id="reports" icon={<BarChart3 size={19} />} text="Reports" />
    <Group k="settings" icon={<Settings size={19} />} text="Settings"><Item indent id="users" icon={<Users size={17} />} text="Users" /><Item indent id="businessInfo" icon={<Building2 size={17} />} text="Business Info" /><Item indent id="conversionTable" icon={<Table2 size={17} />} text="Conversion Table" /><Item indent id="other" icon={<Settings size={17} />} text="Other" /></Group>
    <div className="roles"><div>ROLES</div><b>ADMIN</b><small>WBS Supabase</small></div>
  </aside>;
}
function Card({ title, children }) { return <section className="card"><div className="card-head"><h3>{title}</h3></div>{children}</section>; }
function Input({ label, value, onChange, type = "text" }) { return <label className="field">{label}<input type={type} value={value ?? ""} onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)} /></label>; }
function Table({ cols, rows }) { return <table className="data-table"><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>; }

function Dashboard({ setPage }) {
  const [d, setD] = useState(loadCache("dash", { consumers: 0, unpaid: 0, payments: 0, totalBillings: 0 }));
  useEffect(() => { (async () => {
    const [{ data: consumers }, { data: bills }, { data: payments }] = await Promise.all([
      supabase.from("consumers").select("id"),
      supabase.from("bills").select("*"),
      supabase.from("payments").select("amount")
    ]);
    const mappedBills = (bills || []).map(toBill);
    const next = {
      consumers: (consumers || []).length,
      unpaid: mappedBills.filter(b => b.status !== "Paid").length,
      payments: (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0),
      totalBillings: mappedBills.reduce((s, b) => s + calcBill(b).total, 0)
    };
    setD(next); saveCache("dash", next);
  })(); }, []);
  return <div className="page-grid">
    <div className="stat" onClick={() => setPage("consumerList")}><b>{d.consumers}</b><span>Consumers</span></div>
    <div className="stat" onClick={() => setPage("billingList")}><b>{d.unpaid}</b><span>Unpaid Bills</span></div>
    <div className="stat" onClick={() => setPage("reports")}><b>₱{money.format(d.totalBillings)}</b><span>Total Billings</span></div>
    <div className="stat" onClick={() => setPage("paymentList")}><b>₱{money.format(d.payments)}</b><span>Total Payments</span></div>
  </div>;
}

function Consumers({ mode }) {
  const [rows, setRows] = useState(loadCache("consumers", []));
  const [form, setForm] = useState({ accountNo: "", name: "", address: "", meterNo: "" });
  const refresh = async () => { const { data, error } = await supabase.from("consumers").select("*").order("id", { ascending: false }); if (!error) { const next = (data || []).map(toConsumer); setRows(next); saveCache("consumers", next); } };
  useEffect(() => { refresh(); }, []);
  const add = async () => { const { data, error } = await supabase.from("consumers").insert([{ account_no: form.accountNo, name: form.name, address: form.address, meter_no: form.meterNo }]).select().single(); if (error) return alert(error.message); const next = [toConsumer(data), ...rows]; setRows(next); saveCache("consumers", next); setForm({ accountNo: "", name: "", address: "", meterNo: "" }); };
  const del = async (id) => { const { error } = await supabase.from("consumers").delete().eq("id", id); if (error) return alert(error.message); const next = rows.filter(r => r.id !== id); setRows(next); saveCache("consumers", next); };
  if (mode === "details") return <Card title="Consumer Details"><div className="form-grid"><Input label="Account No." value={form.accountNo} onChange={v => setForm({ ...form, accountNo: v })} /><Input label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} /><Input label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} /><Input label="Meter No." value={form.meterNo} onChange={v => setForm({ ...form, meterNo: v })} /></div><button className="primary" onClick={add}><Plus size={16} /> Save Consumer</button></Card>;
  return <Card title="Consumer List"><Table cols={["Account", "Name", "Address", "Meter", "Action"]} rows={rows.map(r => [r.accountNo, r.name, r.address, r.meterNo, <button className="mini danger" onClick={() => del(r.id)}><Trash2 size={14} /> Delete</button>])} /></Card>;
}

function BillingPeriod() {
  const [periods, setPeriods] = useState(loadCache("periods", [])); const [period, setPeriod] = useState("");
  useEffect(() => { (async () => { const { data } = await supabase.from("billing_periods").select("id,period").order("id", { ascending: false }); const next = data || []; setPeriods(next); saveCache("periods", next); })(); }, []);
  const add = async () => { if (!period) return; const { data, error } = await supabase.from("billing_periods").insert([{ period }]).select().single(); if (error) return alert(error.message); const next = [data, ...periods]; setPeriods(next); saveCache("periods", next); setPeriod(""); };
  return <Card title="Billing Period"><div className="inline-form"><Input label="New Period" value={period} onChange={setPeriod} /><button className="primary" onClick={add}>Add Period</button></div><Table cols={["Period Covered"]} rows={periods.map(p => [p.period])} /></Card>;
}

function Bills({ mode, setPreviewBill }) {
  const [rows, setRows] = useState(loadCache("bills", [sampleBill])); const [form, setForm] = useState({ ...sampleBill });
  const refresh = async () => { const { data, error } = await supabase.from("bills").select("*").order("id", { ascending: false }); if (!error) { const next = (data || []).map(toBill); setRows(next.length ? next : [sampleBill]); saveCache("bills", next.length ? next : [sampleBill]); } };
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    const payload = { period: form.period, as_of: form.asOf, account_no: form.accountNo, due_date: form.dueDate, disconnection_date: form.disconnectionDate, name: form.name, address: form.address, meter_no: form.meterNo, period_from: form.periodFrom, period_to: form.periodTo, present: form.present, previous: form.previous, rate: form.rate, assoc: form.assoc, previous_account: form.previousAccount, previous_months: form.previousMonths, receiver: form.receiver, status: form.status || "Unpaid" };
    const { data, error } = await supabase.from("bills").insert([payload]).select().single(); if (error) return alert(error.message); const next = [toBill(data), ...rows]; setRows(next); saveCache("bills", next); alert("Billing generated.");
  };
  const del = async (id) => { const { error } = await supabase.from("bills").delete().eq("id", id); if (error) return alert(error.message); const next = rows.filter(r => r.id !== id); setRows(next); saveCache("bills", next); };
  if (mode === "generate") return <Card title="Generate Billing"><div className="form-grid">{["period", "accountNo", "name", "address", "meterNo", "previousMonths", "receiver"].map(k => <Input key={k} label={k} value={form[k]} onChange={v => setForm({ ...form, [k]: v })} />)}{["asOf", "dueDate", "disconnectionDate", "periodFrom", "periodTo"].map(k => <Input key={k} label={k} type="date" value={form[k]} onChange={v => setForm({ ...form, [k]: v })} />)}{["present", "previous", "rate", "assoc", "previousAccount"].map(k => <Input key={k} label={k} type="number" value={form[k]} onChange={v => setForm({ ...form, [k]: v })} />)}</div><button className="primary" onClick={add}><Save size={16} /> Generate Billing</button></Card>;
  return <Card title="Billing List"><Table cols={["Period", "Account", "Consumer", "Due", "Amount", "Status", "Action"]} rows={rows.map(b => [b.period, b.accountNo, b.name, fmtDate(b.dueDate), "₱" + money.format(calcBill(b).total), b.status, <div className="row-actions"><button className="mini" onClick={() => setPreviewBill(b)}>Print</button><button className="mini danger" onClick={() => del(b.id)}>Delete</button></div>])} /></Card>;
}

function Payments({ mode }) {
  const [rows, setRows] = useState(loadCache("payments", [])); const [form, setForm] = useState({ accountNo: "HH00-208", date: new Date().toISOString().slice(0, 10), amount: 0, reference: "" });
  useEffect(() => { (async () => { const { data } = await supabase.from("payments").select("*").order("id", { ascending: false }); const next = (data || []).map(toPayment); setRows(next); saveCache("payments", next); })(); }, []);
  const add = async () => { const { data, error } = await supabase.from("payments").insert([{ account_no: form.accountNo, payment_date: form.date, amount: form.amount, reference: form.reference }]).select().single(); if (error) return alert(error.message); await supabase.from("bills").update({ status: "Paid" }).eq("account_no", form.accountNo); const next = [toPayment(data), ...rows]; setRows(next); saveCache("payments", next); alert("Payment posted."); };
  if (mode === "posting") return <Card title="Payment Posting"><div className="form-grid"><Input label="Account No." value={form.accountNo} onChange={v => setForm({ ...form, accountNo: v })} /><Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} /><Input label="Amount" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} /><Input label="Reference" value={form.reference} onChange={v => setForm({ ...form, reference: v })} /></div><button className="primary" onClick={add}>Post Payment</button></Card>;
  return <Card title="Payment List"><Table cols={["Date", "Account", "Amount", "Reference"]} rows={rows.map(p => [fmtDate(p.date), p.accountNo, "₱" + money.format(p.amount), p.reference])} /></Card>;
}

function Reports({ setPage, setPreviewBill }) {
  const [bills, setBills] = useState(loadCache("bills", [sampleBill]));
  useEffect(() => { (async () => { const { data } = await supabase.from("bills").select("*").order("id", { ascending: false }); const next = (data || []).map(toBill); setBills(next.length ? next : [sampleBill]); saveCache("bills", next.length ? next : [sampleBill]); })(); }, []);
  const bill = bills[0] || sampleBill;
  return <div className="report-shell">
    {["Daily Payment Collection Report", "Consumer With Outstanding Billing Report", "Detailed Summary Report"].map(t => <div className="acc" key={t}><button className="acc-head">{t}</button></div>)}
    <div className="acc"><button className="acc-head">Monthly Billing Summary Report</button><div className="acc-body"><div className="monthly-box"><label className="period-label">Period Covered</label><div className="monthly-row"><select value={bill.period} readOnly><option>{bill.period}</option></select><label className="showpay"><input type="checkbox" /> Show Payment</label></div><div className="report-actions"><button onClick={() => setPage("generateBilling")}><FileText size={16} /> Edit Billing Data</button><button
  className="green"
  onClick={() => {
    setPreviewBill(bill);
    setTimeout(() => exportPDF(), 500);
  }}
><Printer size={16} /> Generate Billing Notice</button></div></div></div></div>
    <div className="acc"><button className="acc-head">Billing Summary Report</button></div>
  </div>;
}

function UsersPage() { return <Card title="Users"><p className="muted">Users are managed in Supabase Authentication. Go to Supabase Dashboard → Authentication → Users to add or manage accounts.</p></Card>; }
function BusinessInfo() {
  const [info, setInfo] = useState(loadCache("info", { name: "", address: "", contact: "" }));
  useEffect(() => { (async () => { const { data } = await supabase.from("business_info").select("name,address,contact").eq("id", 1).maybeSingle(); if (data) { setInfo(data); saveCache("info", data); } })(); }, []);
  const saveInfo = async () => { const { error } = await supabase.from("business_info").upsert([{ id: 1, name: info.name, address: info.address, contact: info.contact }]); if (error) return alert(error.message); saveCache("info", info); alert("Saved."); };
  return <Card title="Business Info"><div className="form-grid"><Input label="Business Name" value={info.name} onChange={v => setInfo({ ...info, name: v })} /><Input label="Address" value={info.address} onChange={v => setInfo({ ...info, address: v })} /><Input label="Contact" value={info.contact} onChange={v => setInfo({ ...info, contact: v })} /></div><button className="primary" onClick={saveInfo}>Save</button></Card>;
}
function ConversionTable() { return <Card title="Conversion Table"><Table cols={["Description", "Formula"]} rows={[["Consumption", "Present Reading - Previous Reading"], ["Water Bill", "Consumption × Rate per cu.m"], ["Grand Total Due", "Water Bill + Association Dues + Previous Account"]]} /></Card>; }
function Other() { return <Card title="Other Settings"><p className="muted">Frontend: Vercel React PWA. Database/Auth: Supabase.</p><button className="danger bigbtn" onClick={() => { localStorage.clear(); location.reload(); }}>Clear Local Cache</button></Card>; }

function BillingNotice({ bill, onClose }) {
  if (!bill) return null; const { consumption, water, total } = calcBill(bill);
  return <div className="modal-backdrop"><div className="notice-modal"><div className="notice-toolbar"><b>Generated Billing Notice</b><div><button onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button><button className="iconbtn dark" onClick={onClose}><X size={18} /></button></div></div>
    <div className="paper"><div className="red-note">NOTE: PLEASE PAY IMMEDIATELY TO AVOID DISCONNECTION</div><div className="hoa-title"><b>HOLIDAY HILLS SSS VILLAGE<br />HOMEOWNERS ASSOCIATION INC.</b><small>Barangay San Antonio, City of San Pedro, Laguna</small></div>
      <table className="bill-table"><tbody><tr><td>As of {longDate(bill.asOf)}</td><td className="cyan">Account No.</td><td>{bill.accountNo}</td><td className="yellow">Due Date</td><td className="yellow">{fmtDate(bill.dueDate)}</td></tr><tr><td colSpan="3">{bill.name}</td><td>Disconnection Date</td><td className="pink">{fmtDate(bill.disconnectionDate)}</td></tr><tr><td colSpan="3">{bill.address}</td><td>Meter Number</td><td>{bill.meterNo}</td></tr><tr><td rowSpan="7" className="meter-photo"><div className="fake-meter">{bill.present}</div></td><td>Period Covered</td><td>{bill.periodFrom}</td><td>{bill.periodTo}</td><td></td></tr><tr><td>Present Reading</td><td>Previous Reading</td><td colSpan="2">Consumption per cu.m</td></tr><tr><td className="rednum">{bill.present}</td><td className="rednum">{bill.previous}</td><td colSpan="2" className="rednum">{consumption}</td></tr><tr><td>Water Bill for the Month</td><td>{bill.period}</td><td colSpan="2" className="right">{money.format(water)}</td></tr><tr><td>Previous Month's Account</td><td>{bill.previousMonths}</td><td colSpan="2" className="right">{money.format(bill.previousAccount)}</td></tr><tr><td className="cyan redtext">Total Water Bill</td><td colSpan="3" className="cyan right">{money.format(water)}</td></tr><tr><td>Association Dues for the Month</td><td>{bill.period}</td><td colSpan="2" className="right">{money.format(bill.assoc)}</td></tr><tr><td></td><td>Previous Month's Account</td><td>{bill.previousMonths}</td><td colSpan="2" className="right">{money.format(bill.previousAccount)}</td></tr><tr><td className="cyan redtext" colSpan="4">Total Monthly Due</td><td className="cyan right">{money.format(total)}</td></tr><tr><td className="green-bg big" colSpan="4">Grand Total Due</td><td className="green-bg right big">{money.format(total)}</td></tr></tbody></table>
      <div className="authorized">AS AUTHORIZED, ALL PAYMENTS SHALL BE RECEIVED BY {bill.receiver}</div><table className="schedule"><tbody><tr><td>MONDAY TO FRIDAY @ HOA OFFICE</td><td>8:00 A.M - 12:00 NOON / 1:00 - 4:00 P.M</td></tr><tr><td>SATURDAY @ HOA OFFICE</td><td>8:00 A.M - 12:00 NOON / 1:00 - 3:00 P.M</td></tr></tbody></table><div className="disconnect">THIS WILL SERVE AS YOUR DISCONNECTION NOTICE, IF ACCOUNT IS NOT PAID WITHIN FIVE (5) DAYS AFTER DUE DATE</div></div></div></div>;
}

function App() {
  const [auth, setAuth] = useState(() => ({ session: null, user: loadCache("wbs-user", null) }));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("reports"); const [previewBill, setPreviewBill] = useState(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    supabase.auth.getSession().then(({ data }) => { setAuth({ session: data.session, user: data.session?.user || null }); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setAuth({ session, user: session?.user || null }); if (session?.user) localStorage.setItem("wbs-user", JSON.stringify(session.user)); });
    return () => listener.subscription.unsubscribe();
  }, []);
  if (loading) return <div className="login-page"><div className="login-card"><h2>Loading...</h2></div></div>;
  if (!auth.user) return <Login setAuth={setAuth} />;
  const titles = { dashboard: "Dashboard", consumerDetails: "Consumer Details", consumerList: "Consumer List", billingPeriod: "Billing Period", generateBilling: "Generate Billing", billingList: "Billing List", paymentPosting: "Payment Posting", paymentList: "Payment List", reports: "REPORT MANAGEMENT", users: "Users", businessInfo: "Business Info", conversionTable: "Conversion Table", other: "Other" };
  let content = { dashboard: <Dashboard setPage={setPage} />, consumerDetails: <Consumers mode="details" />, consumerList: <Consumers mode="list" />, billingPeriod: <BillingPeriod />, generateBilling: <Bills mode="generate" setPreviewBill={setPreviewBill} />, billingList: <Bills mode="list" setPreviewBill={setPreviewBill} />, paymentPosting: <Payments mode="posting" />, paymentList: <Payments mode="list" />, reports: <Reports setPage={setPage} setPreviewBill={setPreviewBill} />, users: <UsersPage />, businessInfo: <BusinessInfo />, conversionTable: <ConversionTable />, other: <Other /> }[page];
  return <div className="app"><Sidebar page={page} setPage={setPage} /><main className="main"><div className="topbar"><Menu size={20} /><span>{titles[page]}</span><button className="logout" onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem("wbs-user"); setAuth({ session: null, user: null }); }}><LogOut size={16} /> Logout</button></div><div className={page === "reports" ? "" : "content-pad"}>{content}</div></main><BillingNotice bill={previewBill} onClose={() => setPreviewBill(null)} /></div>;
}

createRoot(document.getElementById("root")).render(<App />);
