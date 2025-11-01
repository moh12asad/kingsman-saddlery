export default function Footer() {
  return (
    <footer className="border-t">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500 flex justify-between">
        <span>© {new Date().getFullYear()} FireWeb</span>
        <span>Made with React & Firebase</span>
      </div>
    </footer>
  );
}
