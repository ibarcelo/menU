"use client";

import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  sessionId: string;
  onClose: () => void;
}

export default function QRShare({ sessionId, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${sessionId}`
      : "";

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full bg-white rounded-t-3xl p-6 pb-10 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Invite your table</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-2xl shadow border border-gray-100">
            <QRCodeSVG value={url} size={200} bgColor="#fff" fgColor="#1a1a1a" />
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mb-4">
          Scan QR code or share the link
        </p>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold rounded-2xl py-3.5 active:bg-gray-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
