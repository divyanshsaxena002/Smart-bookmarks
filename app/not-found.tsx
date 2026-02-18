import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-4 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-600/20 blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/40 mx-auto">
                    <span className="text-4xl font-black text-white">4</span>
                    <span className="text-4xl font-black text-indigo-200">0</span>
                    <span className="text-4xl font-black text-white">4</span>
                </div>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Page not found</h1>
            <p className="mt-3 max-w-sm text-base text-indigo-200/60">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-400 hover:to-purple-500 hover:-translate-y-0.5"
            >
                ← Back to SmartMarks
            </Link>
        </div>
    );
}
