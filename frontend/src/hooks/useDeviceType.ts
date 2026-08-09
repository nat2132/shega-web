"use client";

import { useSyncExternalStore } from "react";

export type DeviceType = "mobile" | "desktop";

function detectDeviceType(): DeviceType {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }
  const ua = navigator.userAgent || "";
  const mobile =
    /Android|iPhone|iPad|iPod|Windows Phone|Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  if (mobile) return "mobile";

  // Touch-first devices (large tablets, convertible laptops) still run the
  // mobile APK, so treat coarse pointers as mobile too.
  if (typeof window.matchMedia === "function") {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return "mobile";
  }

  return "desktop";
}

// The device type is static for the lifetime of the page, so there is nothing
// to subscribe to; the empty subscribe keeps useSyncExternalStore happy.
function subscribe(): () => void {
  return () => {};
}

// Returns whether the current visitor is on a mobile/touch device. The server
// snapshot ("desktop") avoids a hydration mismatch, and the client snapshot
// resolves to the real value on first client render.
export function useDeviceType(): DeviceType {
  return useSyncExternalStore(subscribe, detectDeviceType, () => "desktop");
}

export { detectDeviceType };