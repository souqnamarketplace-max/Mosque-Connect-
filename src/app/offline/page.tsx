import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 text-center">
      <WifiOff className="w-12 h-12 text-ink/60 mb-4" />
      <h1 className="font-display text-xl mb-2">You&apos;re offline</h1>
      <p className="text-ink/60 max-w-xs">
        Check your internet connection. Some prayer time information may still be available if you&apos;ve visited
        recently.
      </p>
    </div>
  );
}
