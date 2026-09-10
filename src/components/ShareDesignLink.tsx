import React, { useEffect, useState } from "react";
import Button from "./ui/Button";

/**
 * Copies a link to the design currently in the URL.
 *
 * The design already lives in the query string; this just makes that
 * discoverable, since a shareable link nobody knows about is not much use.
 */
const ShareDesignLink: React.FC = () => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      // Clipboard access can be refused, and is unavailable outside a secure
      // context. Fall back to selecting the URL so it can be copied by hand.
      setState("failed");
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <Button variant="quiet" onClick={copy}>
        Copy a link to this design
      </Button>
      <span
        aria-live="polite"
        style={{ fontSize: "var(--text-sm)", color: "var(--ink-faint)" }}
      >
        {state === "copied" && "Copied."}
        {state === "failed" && "Press Ctrl/Cmd+L then copy the address bar."}
      </span>
    </div>
  );
};

export default ShareDesignLink;
