import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { supabase } from "./supabase";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔥 Load session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔥 SIGN UP
  async function signUp() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Signup success!");
  }

  // 🔥 LOGIN
  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  }

  // 🔥 LOGOUT
  async function logout() {
    await supabase.auth.signOut();
  }

  // 🔥 UI
  if (!session) {
    return (
      <div className="login-container">
        <h2>WBS Billing System</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={signUp}>Create Account</button>
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Welcome</h2>
      <p>{session.user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// 🔥 RENDER
ReactDOM.createRoot(document.getElementById("root")).render(<App />);