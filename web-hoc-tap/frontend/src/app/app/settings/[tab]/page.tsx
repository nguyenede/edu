'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SettingsPage, { SettingsTabType } from '../page';

export default function SettingsTabSubPage() {
  const params = useParams();
  const rawTab = (params?.tab as string) || 'overview';

  const tabMap: Record<string, SettingsTabType> = {
    overview: 'overview',
    account: 'account',
    security: 'security',
    password: 'security',
    units: 'unit',
    unit: 'unit',
    notifications: 'notifications',
    appearance: 'appearance',
    storage: 'storage',
    privacy: 'data_privacy',
    pro: 'pro_plan',
  };

  const mappedTab = tabMap[rawTab] || 'overview';

  return <SettingsPage initialTab={mappedTab} />;
}
