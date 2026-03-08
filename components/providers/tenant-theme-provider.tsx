"use client";

import React from "react";

interface TenantThemeProviderProps {
  theme: Record<string, string> | null;
  children: React.ReactNode;
}

/**
 * Applies tenant-specific CSS variables for branding.
 * Supports keys: primaryColor/primary, secondaryColor/secondary, accent, background.
 * Wraps children in a div with CSS custom properties.
 */
export function TenantThemeProvider({ theme, children }: TenantThemeProviderProps) {
  if (!theme || Object.keys(theme).length === 0) {
    return <>{children}</>;
  }

  const cssVars: Record<string, string> = {};
  const primary = theme.primaryColor || theme.primary;
  const secondary = theme.secondaryColor || theme.secondary;

  if (primary) cssVars["--primary"] = hexToHsl(primary);
  if (secondary) cssVars["--secondary"] = hexToHsl(secondary);
  if (theme.accent) cssVars["--accent"] = hexToHsl(theme.accent);
  if (theme.background) cssVars["--background"] = hexToHsl(theme.background);

  if (Object.keys(cssVars).length === 0) {
    return <>{children}</>;
  }

  return (
    <div style={cssVars as React.CSSProperties} className="contents">
      {children}
    </div>
  );
}

/**
 * Convert hex color (#3b82f6) to HSL string (217 91% 60%)
 * that shadcn/ui CSS variables expect.
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
