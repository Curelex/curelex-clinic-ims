import { useEffect, useState } from "react";
import DataTable from "../components/common/DataTable";
import { createCustomer, fetchCustomers } from "../services/customerService";
import { currency } from "../utils/format";

const CustomersPage = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", creditLimit: "" });

  const load = async () => {
    const data = await fetchCustomers();
    setRows(data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    await createCustomer({ ...form, creditLimit: Number(form.creditLimit || 0) });
    setForm({ name: "", phone: "", email: "", creditLimit: "" });
    await load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-4">
        <input placeholder="Name" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input placeholder="Phone" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        <input placeholder="Email" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input placeholder="Credit limit" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.creditLimit} onChange={(e) => setForm((p) => ({ ...p, creditLimit: e.target.value }))} />
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-4">Add customer</button>
      </form>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "creditLimit", label: "Credit limit", render: (row) => currency(row.creditLimit) },
          { key: "outstandingAmount", label: "Outstanding", render: (row) => currency(row.outstandingAmount) }
        ]}
        rows={rows}
      />
    </div>
  );
};

export default CustomersPage;
