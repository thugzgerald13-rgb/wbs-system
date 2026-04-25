import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const LS = {
  get: (k) => JSON.parse(localStorage.getItem(k) || "[]"),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

function Login({ onLogin }) {
  const [user, setUser] = useState("");

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>WBS System Login</h2>
        <input placeholder="Enter username" value={user} onChange={e => setUser(e.target.value)} />
        <button onClick={() => user && onLogin(user)}>Login</button>
      </div>
    </div>
  );
}

function Sidebar({ setPage }) {
  return (
    <div className="sidebar">
      <div className="userbar">
        <span>WBS SYSTEM</span>
      </div>
      <button className="side-item" onClick={() => setPage("dashboard")}>Dashboard</button>
      <button className="side-item" onClick={() => setPage("billing")}>Billing</button>
      <button className="side-item" onClick={() => setPage("reports")}>Reports</button>
    </div>
  );
}

function Dashboard({ bills }) {
  const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div className="content-pad">
      <h2>Dashboard</h2>
      <div className="stat">
        <b>₱{total.toLocaleString()}</b>
        <span>Total Billing</span>
      </div>
    </div>
  );
}

function Billing({ bills, setBills }) {
  const [form, setForm] = useState({ name: "", amount: "" });

  const add = () => {
    const newData = [...bills, { ...form, id: Date.now() }];
    setBills(newData);
    LS.set("bills", newData);
    setForm({ name: "", amount: "" });
  };

  return (
    <div className="content-pad">
      <h2>Billing</h2>

      <div className="card">
        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <button onClick={add}>Add Bill</button>
      </div>

      <table className="data-table">
        <thead><tr><th>Name</th><th>Amount</th></tr></thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id}><td>{b.name}</td><td>₱{Number(b.amount).toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reports({ bills }) {
  const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div className="content-pad">
      <h2>Reports</h2>
      <p>Total Bills: ₱{total.toLocaleString()}</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [bills, setBills] = useState([]);

  useEffect(() => {
    setBills(LS.get("bills"));
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app">
      <Sidebar setPage={setPage} />
      <div className="main">
        {page === "dashboard" && <Dashboard bills={bills} />}
        {page === "billing" && <Billing bills={bills} setBills={setBills} />}
        {page === "reports" && <Reports bills={bills} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
