'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        {/* Logo / App Icon */}
        <img
          src="/logo.png"
          alt="App Logo"
          className="w-16 h-16 rounded-3xl object-cover bg-neutral-900"
        />

        {/* Animated Dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Text */}
        <p className="text-neutral-500 text-sm font-medium">Cargando...</p>
      </div>
    </div>
  );
}
