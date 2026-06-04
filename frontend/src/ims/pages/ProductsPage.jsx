import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import usePermissions from "../hooks/usePermissions";
import {
  createProduct,
  fetchProducts,
  getProductBarcode,
  getProductQr,
} from "../services/productService";
import { currency } from "../utils/format";

// ✅ FIXED: form now has proper fields — sku is a product CODE, mrpPrice is a number
const initialForm = {
  name:        "",
  sku:         "",   // Product code string e.g. "MED-001", "PARA-500"
  mrpPrice:    "",   // MRP Price (₹)
  costPrice:   "",   // Purchase Price (₹)
  price:       "",   // Selling Price (₹)
  description: "",
};

// ✅ FIXED: correct labels for each field
const fieldLabels = {
  name:        "Product Name",
  sku:         "SKU / Product Code (e.g. MED-001)",
  mrpPrice:    "MRP Price",
  costPrice:   "Purchase Price",
  price:       "Selling Price",
  description: "Description (optional)",
};

// Fields that should render as number inputs
const numberFields = new Set(["mrpPrice", "costPrice", "price"]);

const ProductsPage = () => {
  const { canWriteProducts } = usePermissions();
  const [products, setProducts] = useState([]);
  const [form, setForm]         = useState(initialForm);
  const [loading, setLoading]   = useState(false);
  const [qrModal, setQrModal]   = useState(null);
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

  // ── Load products ──────────────────────────────────────────────
  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data.data || []);
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // ── Create product ─────────────────────────────────────────────
  const onCreate = async (event) => {
    event.preventDefault();

    // Basic client-side guard: SKU must not be purely numeric
    if (/^\d+$/.test(form.sku.trim())) {
      toast.error("SKU should be a product code like MED-001, not just a number.");
      return;
    }

    setLoading(true);
    try {
      await createProduct({
        name:        form.name.trim(),
        sku:         form.sku.trim(),
        mrpPrice:    Number(form.mrpPrice),
        costPrice:   Number(form.costPrice),
        price:       Number(form.price),
        description: form.description.trim(),
        category:    "General",
      });
      toast.success("Product created successfully!");
      setForm(initialForm);
      await loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  // ── QR / Barcode modals ────────────────────────────────────────
  const openQr = async (product) => {
    try {
      const data = await getProductQr(product._id);
      setQrModal({ type: "qr", src: data.qrDataUrl, name: product.name });
    } catch {
      toast.error("Could not load QR code");
    }
  };

  const openBarcode = async (product) => {
    try {
      const src = await getProductBarcode(product._id);
      setQrModal({ type: "barcode", src, name: product.name });
    } catch {
      toast.error("Could not load barcode");
    }
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns = [
    { key: "name",      label: "Name" },
    { key: "sku",       label: "SKU",            render: (row) => row.sku },
    { key: "mrpPrice",  label: "MRP Price",       render: (row) => currency(row.mrpPrice) },
    { key: "costPrice", label: "Purchase Price",   render: (row) => currency(row.costPrice) },
    { key: "price",     label: "Selling Price",    render: (row) => currency(row.price) },
    { key: "quantity",  label: "Quantity",         render: (row) => row.inventory?.quantity ?? 0 },
    {
      key: "codes",
      label: "Codes",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openQr(row)}
            className="rounded bg-teal-600 px-2 py-0.5 text-xs text-white hover:bg-teal-700"
          >
            QR
          </button>
          <button
            onClick={() => openBarcode(row)}
            className="rounded bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
          >
            Barcode
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* QR / Barcode modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setQrModal(null)}
        >
          <div
            className="rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-center text-sm font-semibold text-slate-800">
              {qrModal.type === "qr" ? "QR Code" : "Barcode"} — {qrModal.name}
            </p>
            <img src={qrModal.src} alt="code" className="mx-auto max-w-[260px]" />
            <button
              onClick={() => setQrModal(null)}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add product form */}
      {canWriteProducts && (
        <form
        ref={formRef}
          onSubmit={onCreate}
          className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-3"
        >
          {Object.keys(initialForm).map((field) => (
            <input
            onKeyDown={handleEnter}
              key={field}
              placeholder={fieldLabels[field]}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
              value={form[field]}
              // ✅ FIXED: only price fields are type="number"; sku is type="text"
              type={numberFields.has(field) ? "number" : "text"}
              min={numberFields.has(field) ? "0" : undefined}
              step={numberFields.has(field) ? "0.01" : undefined}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [field]: e.target.value }))
              }
              required={field !== "description"}
            />
          ))}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-3 disabled:opacity-60"
          >
            {loading ? "Adding…" : "Add product"}
          </button>
        </form>
      )}

      <DataTable columns={columns} rows={products} />
    </div>
  );
};

export default ProductsPage;