// ═══════════════════════════════════════════════════════════════
// USE-NETWORK-QUALITY — 2G/3G/4G/WiFi detection
// India reality: 40% users on slow networks. Adapt UI accordingly.
// Load smaller images on 2G, disable animations, show warnings.
//
// Uses Navigator.connection API (Chrome/Android/Samsung).
// Gracefully degrades to "unknown" on unsupported browsers.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

type NetworkSpeed = '2g' | '3g' | '4g' | 'wifi' | 'unknown';

interface NetworkQuality {
  /** Effective connection type */
  speed: NetworkSpeed;
  /** true if 2G or 3G (slow) */
  isSlow: boolean;
  /** true if offline */
  isOffline: boolean;
  /** Downlink speed in Mbps (0 if unknown) */
  downlinkMbps: number;
}

/**
 * Returns current network quality information.
 * Use to adapt image quality, disable animations on slow networks.
 *
 * @example
 * const { isSlow } = useNetworkQuality();
 * const imageQuality = isSlow ? 'low' : 'high';
 */
export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    speed: 'unknown',
    isSlow: false,
    isOffline: false,
    downlinkMbps: 0,
  });

  useEffect(() => {
    function update() {
      const conn = (navigator as NavigatorWithConnection).connection;
      const isOffline = !navigator.onLine;

      if (!conn) {
        setQuality({ speed: 'unknown', isSlow: false, isOffline, downlinkMbps: 0 });
        return;
      }

      const speed = (conn.effectiveType || 'unknown') as NetworkSpeed;
      setQuality({
        speed,
        isSlow: speed === '2g' || speed === '3g',
        isOffline,
        downlinkMbps: conn.downlink ?? 0,
      });
    }

    update();

    const conn = (navigator as NavigatorWithConnection).connection;
    if (conn) {
      conn.addEventListener('change', update);
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      if (conn) conn.removeEventListener('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return quality;
}

// Navigator.connection type augmentation
interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}
