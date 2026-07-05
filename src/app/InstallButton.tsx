"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Floating "Install app" affordance for Android/Chrome/desktop. It only appears
// once the browser fires `beforeinstallprompt` (i.e. the app is installable and
// not already installed). iOS has no such event — staff use Share → Add to
// Home Screen there.
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-wine px-5 py-2.5 text-sm font-medium text-onwine shadow-lg transition-colors hover:bg-wine-deep"
    >
      ⬇ Install App
    </button>
  );
}
