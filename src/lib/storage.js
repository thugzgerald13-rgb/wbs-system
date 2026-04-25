import { supabase, isSupabaseConfigured } from '../supabase';

export const LS = {
  get: (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

export const fieldToDb = {
  accountNo: 'account_no',
  meterNo: 'meter_no',
  consumerId: 'consumer_id',
  dueDate: 'due_date',
  previousReading: 'previous_reading',
  presentReading: 'present_reading',
  previousBalance: 'previous_balance',
  createdAt: 'created_at',
  businessName: 'business_name',
  officeHours1: 'office_hours1',
  officeHours2: 'office_hours2',
};

export const fieldFromDb = Object.fromEntries(Object.entries(fieldToDb).map(([a, b]) => [b, a]));

export function toDb(row, userId) {
  const output = {};
  Object.entries(row).forEach(([key, value]) => {
    output[fieldToDb[key] || key] = value;
  });
  if (userId) output.user_id = userId;
  return output;
}

export function fromDb(row) {
  const output = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (key !== 'user_id') output[fieldFromDb[key] || key] = value;
  });
  return output;
}

export async function listRows(table, localKey) {
  if (!isSupabaseConfigured) return LS.get(localKey);
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromDb);
}

export async function upsertRows(table, localKey, rows, userId) {
  if (!isSupabaseConfigured) {
    LS.set(localKey, rows);
    return rows;
  }
  if (!rows.length) return rows;
  const { error } = await supabase.from(table).upsert(rows.map((row) => toDb(row, userId)), { onConflict: 'id' });
  if (error) throw error;
  return rows;
}

export async function removeRow(table, localKey, rows, id) {
  const next = rows.filter((row) => row.id !== id);
  if (!isSupabaseConfigured) {
    LS.set(localKey, next);
    return next;
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return next;
}
