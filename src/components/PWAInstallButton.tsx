import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="h-8 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
        title="نصب اپلیکیشن (PWA)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>نصب اپ</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="h-8 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
          title="راهنمای نصب روی آیفون و آیپد"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>نصب روی آیفون</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    نصب به عنوان اپلیکیشن آیفون
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-lg bg-[#f2f3f6] hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-700 leading-relaxed">
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#f5f6f8]">
                  <div className="w-7 h-7 rounded-lg bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Share className="w-4 h-4" />
                  </div>
                  <p>
                    ۱. در مرورگر <strong>Safari</strong>، دکمه <strong>Share</strong> (اشتراک‌گذاری) را بزنید.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#f5f6f8]">
                  <div className="w-7 h-7 rounded-lg bg-white text-neutral-900 flex items-center justify-center shrink-0 shadow-2xs">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <p>
                    ۲. به پایین اسکرول کنید و <strong>Add to Home Screen</strong> را انتخاب و تایید کنید.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
