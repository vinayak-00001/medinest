"use client";

import { useState } from "react";

interface CallLauncherProps {
  callUrl: string;
}

export function CallLauncher({ callUrl }: CallLauncherProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(callUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="consultation-actions">
      <a className="button" href={callUrl} rel="noreferrer" target="_self">
        Start audio call
      </a>
      <a className="ghost-button" href={callUrl} rel="noreferrer" target="_blank">
        Backup link
      </a>
      <button className="ghost-button" onClick={copyLink} type="button">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
