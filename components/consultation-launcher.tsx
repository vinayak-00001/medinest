"use client";

import { useState } from "react";

interface ConsultationLauncherProps {
  jitsiUrl: string;
}

export function ConsultationLauncher({ jitsiUrl }: ConsultationLauncherProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(jitsiUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="consultation-actions">
      <a className="button" href={jitsiUrl} rel="noreferrer" target="_self">
        Join consultation
      </a>
      <a className="ghost-button" href={jitsiUrl} rel="noreferrer" target="_blank">
        Backup link
      </a>
      <button className="ghost-button" onClick={copyLink} type="button">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
