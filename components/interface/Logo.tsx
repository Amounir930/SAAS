'use client';

import React from 'react';
import Link from 'next/link';
import { useBranding } from '@/providers/branding-provider';

interface LogoProps {
  showName?: boolean;
}

export default function Logo({ showName = true }: LogoProps) {
  const { branding } = useBranding();

  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-primary"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </div>
      {showName && (
        <span className="font-bold text-xl tracking-tight text-foreground">
          {branding?.name || 'WhatSaaS'}
        </span>
      )}
    </Link>
  );
}
