"use client";

import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  url: string;
  title?: string;
  /** Extra CSS classes on the trigger button */
  className?: string;
  /** Label shown next to the icon */
  label?: string;
}

export function ShareButton({ url, title = "Check this out!", className = "", label }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return; // native sheet handled it
      } catch {
        // user cancelled or unsupported — fall through to modal
      }
    }
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the URL manually.");
    }
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}&qzone=2&format=png`;

  return (
    <>
      <button
        onClick={handleShare}
        className={`flex items-center gap-1.5 ${className}`}
        title="Share"
      >
        <Share2 className="h-4 w-4" />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Share</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="flex justify-center">
              <img
                src={qrSrc}
                alt="QR code"
                width={200}
                height={200}
                className="rounded-xl border border-gray-100 dark:border-gray-800"
              />
            </div>

            {/* URL + copy */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
              <p className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">{url}</p>
              <button
                onClick={copyLink}
                className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400">
              Scan the QR code or share the link — no login required to view.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
