import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { supabase, isSupabaseConfigured } from "./supabase";

const money = (n) => Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const LS = {
  get: (k) => JSON.parse(localStorage.getItem(k) || "[]"),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

async function fetchTable(table) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(table).select("*");
    return data || [];
  }
  return LS.get(table);
}

async function insertTable(table, row) {
  if (isSupabaseConfigured) {
    return await supabase.from(table).insert(row);
  }
  const data = LS.get(table);
  data.push({ ...row, id: Date.now() });
  LS.set(table, data);
}

function App() {
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState({ name: "", amount: "" });

  const load = async () => {
    const data = await fetchTable("bills");
    setBills(data);
  };

  useEffect(() => { load(); }, []);

  const addBill = async () => {
    if (!form.name || !form.amount) return alert("Fill all fields");
    await insertTable("bills", form);
    setForm({ name: "", amount: "" });
    load();
  };

  const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div className="content-pad">
      <h2>WBS Billing System</h2>

      {!isSupabaseConfigured && (
        <div className="error">LOCAL MODE (No Supabase)</div>
      )}

      <div className="card">
        <h3>Add Bill</h3>
        <input value={form.name} placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
        <input value={form.amount} placeholder="Amount" type="number" onChange={e => setForm({ ...form, amount: e.target.value })} />
        <button onClick={addBill}>Add</button>
      </div>

      <div className="card">
        <h3>All Bills</h3>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Amount</th></tr></thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>₱{money(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Total: ₱{money(total)}</h3>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
