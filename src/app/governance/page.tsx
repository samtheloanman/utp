import React from 'react';
import { createDaoReader } from '@/modules/dao-chain/reader';
import { GovernanceClient } from '@/components/governance/GovernanceClient';

export const revalidate = 15;

export default async function GovernancePage() {
  const overview = await createDaoReader().readOverview();
  return <GovernanceClient overview={overview} />;
}
