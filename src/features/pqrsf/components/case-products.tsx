import { formatDate } from "../lib/format";
import type { CaseProduct, PqrsfCase } from "../types/pqrsf.types";

const NO_SUPPLIER = "Sin proveedor en el maestro";

function supplierOf(product: CaseProduct): string {
  return product.supplier_name ?? product.supplier_code ?? NO_SUPPLIER;
}

/**
 * The products the customer reported, with the supplier the product master
 * gave at that moment. They are what the customer sent, so they are read-only;
 * the supplier of the case comes from them.
 */
export default function CaseProducts({ item }: { item: PqrsfCase }) {
  const products = item.products ?? [];
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="products-heading" className="space-y-3">
      <h2 id="products-heading" className="text-base font-semibold">
        Productos
        <span className="tabular ml-2 text-sm font-normal text-text-secondary">
          {products.length} {products.length === 1 ? "línea" : "líneas"}
        </span>
      </h2>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">Producto</th>
              <th scope="col" className="px-3 py-2">Proveedor</th>
              <th scope="col" className="px-3 py-2">Factura</th>
              <th scope="col" className="px-3 py-2">Lote</th>
              <th scope="col" className="px-3 py-2 text-right">Vence</th>
              <th scope="col" className="px-3 py-2 text-right" title="Unidades con la novedad">
                Cant.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="h-10 align-top">
                <td className="max-w-60 px-3 py-2">
                  <span className="block font-mono text-[13px]">{product.sku}</span>
                  {product.description && (
                    <span className="block truncate text-[13px] text-text-secondary" title={product.description}>
                      {product.description}
                    </span>
                  )}
                </td>
                <td className="max-w-44 px-3 py-2">
                  <span
                    className={
                      product.supplier_name || product.supplier_code
                        ? "block truncate"
                        : "block truncate text-text-secondary"
                    }
                    title={supplierOf(product)}
                  >
                    {supplierOf(product)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[13px]">{product.invoice_number}</td>
                <td className="px-3 py-2 font-mono text-[13px]">{product.lot}</td>
                <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                  {formatDate(product.expiry_date)}
                </td>
                <td className="tabular px-3 py-2 text-right">{product.affected_quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {products.map((product) => (
          <li key={product.id} className="space-y-2 p-3">
            <p className="min-w-0 text-sm">
              <span className="font-mono text-[13px]">{product.sku}</span>
              {product.description && <span className="break-words"> · {product.description}</span>}
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-text-secondary">Proveedor</dt>
              <dd className="text-right break-words">{supplierOf(product)}</dd>
              <dt className="text-text-secondary">Factura</dt>
              <dd className="text-right font-mono break-words">{product.invoice_number}</dd>
              <dt className="text-text-secondary">Lote</dt>
              <dd className="text-right font-mono break-words">{product.lot}</dd>
              <dt className="text-text-secondary">Vence</dt>
              <dd className="tabular text-right">{formatDate(product.expiry_date)}</dd>
              <dt className="text-text-secondary">Cantidad afectada</dt>
              <dd className="tabular text-right">{product.affected_quantity}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
