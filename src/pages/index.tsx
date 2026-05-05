// app/page.tsx

export default function HomePage() {
  return (
    <div className="max-w-3xl flex flex-col mx-auto size-full">
      <header className="mb-auto flex justify-center z-50 w-full py-4">
        <nav className="px-4 sm:px-6 lg:px-8">
          <a
            className="flex-none text-xl font-semibold sm:text-3xl dark:text-white"
            href="#"
            aria-label="Brand"
          >
            Brand
          </a>
        </nav>
      </header>
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <h1 className="text-4xl font-bold text-gray-800">
          Welcome to MurderBoard Blog
        </h1>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <footer className="absolute bottom-0 inset-x-0 text-center py-5">
          <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-white/50">
              © 2025 Preline Labs. A product of{" "}
              <a
                className="text-white font-medium hover:text-white/80 focus:outline-hidden focus:text-white/80"
                href="../index.html"
              >
                Htmlstream
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
