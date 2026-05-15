import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import usePermissions from "../hooks/usePermissions";
import { adjustInventory, fetchInventory } from "../services/inventoryService";
import { fetchProducts } from "../services/productService";

const InventoryPage = () => {
  const { isAdmin } = usePermissions();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [adjustForm, setAdjustForm] = useState({ productId: "", adjustment: "", reason: "" });

  const loadInventory = async () => {
    const data = await fetchInventory();
    setRows(data.data || []);
  };

  useEffect(() => {
    loadInventory();
    fetchProducts().then((d) => setProducts(d.data || []));
  }, []);

  const onAdjust = async (event) => {
    event.preventDefault();
    await adjustInventory({
      productId: adjustForm.productId,
      adjustment: Number(adjustForm.adjustment),
      reason: adjustForm.reason
    });
    toast.success("Stock adjusted");
    setAdjustForm({ productId: "", adjustment: "", reason: "" });
    await loadInventory();
  };

  const columns = [
    { key: "product", label: "Product", render: (row) => row.product?.name || "-" },
    { key: "sku", label: "SKU", render: (row) => row.product?.sku || "-" },
    { key: "quantity", label: "Quantity" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        if (row.outOfStock) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Out of stock</span>;
        if (row.lowStock) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Low stock</span>;
        return <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">Available</span>;
      }
    }
  ];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form
          onSubmit={onAdjust}
          className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-3"
        >
          <select
            value={adjustForm.productId}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, productId: e.target.value }))}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            required
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <input
            placeholder="Adjustment (+/-)"
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            value={adjustForm.adjustment}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment: e.target.value }))}
            required
          />
          <input
            placeholder="Reason (e.g. damaged)"
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
            required
          />
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-3">
            Adjust stock
          </button>
        </form>
      )}
      <DataTable columns={columns} rows={rows} />
    </div>
  );
};

export default InventoryPage;