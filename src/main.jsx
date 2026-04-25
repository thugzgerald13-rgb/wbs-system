import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { supabase } from "./supabase";
import { exportPDF } from "./utils/pdf";
import { exportToExcel } from "./utils/exportExcel";

const money = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const groupBy = (arr, keyFn) =>
  arr.reduce((m, x) => {
    const k = keyFn(x);
    (m[k] ||= []).push(x);
    return m;
  }, {});

const sum = (arr, fn) => arr.reduce((s, x) => s + Number(fn(x) || 0), 0);

function calcBill(b) {
  const consumption = Math.max(0, b.present - b.previous);
  const water = consumption * b.rate;
  return { total: water + b.assoc + b.previousAccount };
}

function Reports({ setPreviewBill }) {
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("bills").select("*");
      const { data: p } = await supabase.from("payments").select("*");
      setBills(b || []);
      setPayments(p || []);
    })();
  }, []);

  const toggle = (k) => setOpen(open === k ? null : k);

  const paymentsByDay = groupBy(payments, x => x.payment_date);
  const dailyRows = Object.entries(paymentsByDay).map(([date, rows]) => ({
    date,
    total: sum(rows, r => r.amount),
    count: rows.length
  }));

  const unpaid = bills.filter(b => b.status !== "Paid");

  const detailed = Object.values(
    groupBy(bills, b => b.account_no)
  ).map(rows => {
    const total = sum(rows, r => calcBill(r).total);
    return {
      name: rows[0].name,
      account: rows[0].account_no,
      total
    };
  });

  const monthly = Object.entries(groupBy(bills, b => b.period)).map(([p, r]) => ({
    period: p,
    total: sum(r, x => calcBill(x).total)
  }));

  return (
    <div className="report-shell">

      {/* DAILY */}
      <div className="acc">
        <button className="acc-head" onClick={() => toggle("daily")}>
          Daily Payment Collection Report
        </button>
        {open === "daily" && (
          <div className="acc-body">
            <table>
              <thead>
                <tr><th>Date</th><th>Count</th><th>Total</th></tr>
              </thead>
              <tbody>
                {dailyRows.map(r => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.count}</td>
                    <td>₱{money.format(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => exportToExcel(dailyRows)}>Export Excel</button>
          </div>
        )}
      </div>

      {/* OUTSTANDING */}
      <div className="acc">
        <button className="acc-head" onClick={() => toggle("outstanding")}>
          Consumer With Outstanding Billing Report
        </button>
        {open === "outstanding" && (
          <div className="acc-body">
            <table>
              <tbody>
                {unpaid.map(b => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>₱{money.format(calcBill(b).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED */}
      <div className="acc">
        <button className="acc-head" onClick={() => toggle("detailed")}>
          Detailed Summary Report
        </button>
        {open === "detailed" && (
          <div className="acc-body">
            <table>
              <tbody>
                {detailed.map(d => (
                  <tr key={d.account}>
                    <td>{d.name}</td>
                    <td>₱{money.format(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MONTHLY */}
      <div className="acc">
        <button className="acc-head" onClick={() => toggle("monthly")}>
          Monthly Billing Summary Report
        </button>
        {open === "monthly" && (
          <div className="acc-body">
            <table>
              <tbody>
                {monthly.map(m => (
                  <tr key={m.period}>
                    <td>{m.period}</td>
                    <td>₱{money.format(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => exportToExcel(monthly)}>
              Export Excel
            </button>

            <button onClick={() => {
              setPreviewBill(bills[0]);
              setTimeout(() => exportPDF(), 500);
            }}>
              Generate PDF
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function BillingNotice({ bill, onClose }) {
  if (!bill) return null;

  return (
    <div className="modal">
      <div className="paper">
        <h2>{bill.name}</h2>
        <p>₱{money.format(calcBill(bill).total)}</p>
        <button onClick={() => exportPDF()}>Download PDF</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function App() {
  const [previewBill, setPreviewBill] = useState(null);

  return (
    <div>
      <Reports setPreviewBill={setPreviewBill} />
      <BillingNotice bill={previewBill} onClose={() => setPreviewBill(null)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);