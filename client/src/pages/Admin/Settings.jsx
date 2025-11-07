export default function AdminSettings(){
  return (
    <div className="card">
      <div className="section-title">Settings</div>
      <ul className="list-disc ml-5 text-gray-700 text-sm space-y-1">
        <li>Store details (name, logo, contact)</li>
        <li>Shipping and tax configuration</li>
        <li>Payment providers</li>
        <li>Roles & permissions</li>
      </ul>
    </div>
  );
}


