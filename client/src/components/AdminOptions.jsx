export default function AdminOptions() {
    const features = [
        { title: "Add Owner", link: "/create-owner" },
        { title: "View Owners", link: "/owners" },
    ];

    return (
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold mb-6">Actions</h2>
            <div className="flex flex-wrap justify-center gap-4">
                {features.map((f, i) => (
                    <a
                        key={i}
                        href={f.link}
                        className="block w-1/2 text-left px-6 py-8 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-indigo-600 hover:text-white transition shadow-sm hover:shadow-md"
                    >
                        {f.title}
                    </a>
                ))}
            </div>
        </section>
    );
}
