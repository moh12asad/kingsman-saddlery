export default function AdminDashboard(){
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card">
        <div className="section-title">Overview</div>
        <p className="text-gray-600 text-sm">Key stats and quick links will go here.</p>
      </div>
      <div className="card">
        <div className="section-title">Orders</div>
        <p className="text-gray-600 text-sm">Recent orders summary.</p>
      </div>
      <div className="card">
        <div className="section-title">Inventory</div>
        <p className="text-gray-600 text-sm">Low-stock alerts and products on sale.</p>
      </div>
    </div>
  );
}


