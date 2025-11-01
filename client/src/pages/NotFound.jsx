export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-black">404</h1>
        <p className="text-gray-600 mt-2">Page not found</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg border hover:bg-gray-50">Back home</a>
      </div>
    </div>
  );
}
