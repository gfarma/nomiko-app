"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.origin + path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή link"}
    </button>
  );
}
