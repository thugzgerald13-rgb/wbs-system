import React, {useEffect, useState} from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Users, UserPlus, List, Droplet, CalendarDays, ClipboardList,
  CircleDollarSign, BarChart3, Settings, Building2, Table2, ChevronUp, ChevronDown,
  Menu, Printer, FileText, X, Save, Plus, Trash2, LogOut
} from "lucide-react";
import "./styles.css";
import { supabase } from "./supabase";

// 🔥 REMOVED API (Supabase now used)

const money = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 🔥 REMOVE API FUNCTION COMPLETELY

function saveCache(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadCache(k,fallback){ try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } }
function fmtDate(v){ const d=new Date(v); return isNaN(d) ? (v||"") : d.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}); }
function longDate(v){ const d=new Date(v); return isNaN(d) ? (v||"") : d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); }
function calcBill(b){ const consumption=Math.max(0,Number(b.present||0)-Number(b.previous||0)); const water=+(consumption*Number(b.rate||0)).toFixed(2); return {consumption,water,total:water+Number(b.assoc||0)+Number(b.previousAccount||0)}; }

// NOTE: Remaining file unchanged for now — next step will replace all API calls with Supabase

export default function Placeholder(){return null;}