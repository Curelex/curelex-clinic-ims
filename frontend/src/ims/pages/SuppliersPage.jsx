import { useEffect, useState ,useRef} from "react";
import DataTable from "../components/common/DataTable";
import { createSupplier, fetchSuppliers } from "../services/supplierService";

const SuppliersPage = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const load = async () => {
    const data = await fetchSuppliers();
    setRows(data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    await createSupplier(form);
    setForm({ name: "", phone: "", email: "" });
    await load();
  };

  const formRef = useRef(null);
  
  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    const fields = Array.from(
      formRef.current.querySelectorAll(
        "input, textarea, button"
      )
    ).filter(
      (el) => !el.disabled
    );
  
    const index = fields.indexOf(e.target);
  
    if (index < fields.length - 1) {
      fields[index + 1].focus();
    } else {
      onCreate(e);
    }
  };

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={onCreate} className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-3">
        <input onKeyDown={handleEnter} placeholder="Name" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input onKeyDown={handleEnter} placeholder="Phone" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        <input onKeyDown={handleEnter} placeholder="Email" className="rounded-lg border border-brand-100 px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-3">Add supplier</button>
      </form>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" }
        ]}
        rows={rows}
      />
    </div>
  );
};

export default SuppliersPage;
