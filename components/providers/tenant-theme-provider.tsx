"use client";

import React from "react";

interface TenantThemeProviderProps {
  theme: Record<string, string> | null;
  children: React.ReactNode;
}

/**
 * Applies tenant-specific CSS variables for branding.
 * Expected theme keys: primary, secondary, background, accent, etc.
 * Falls back to default theme if no tenant theme is provided.
 */
export function TenantThemeProvider({ theme, children }: TenantThemeProviderProps) {
  if (!theme || Object.keys(theme).length === 0) {
    return <>{children}</>;
  }

  const cssVars: Record<string, string> = {};
  if (theme.primary) cssVars["--primary"] = theme.primary;
  if (theme.secondary) cssVars["--secondary"] = theme.secondary;
  if (theme.accent) cssVars["--accent"] = theme.accent;
  if (theme.background) cssVars["--background"] = theme.background;

  return (
    <div style={cssVars as React.CSSProperties}>
      {children}
    </div>
  );
}
