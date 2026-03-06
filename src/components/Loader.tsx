// components/Loader.tsx

export default function Loader() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
            <img
                src="/icons/icon-192.png"
                alt="Logo"
                className="w-20 h-20 animate-pulse"
            />
        </div>
    );
}