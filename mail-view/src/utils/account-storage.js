export function getAccountDomain(email = '') {
  const index = email.indexOf('@');
  return index > -1 ? email.slice(index).toLowerCase() : '';
}

export function groupAccountsByDomain(accounts = []) {
  const groups = new Map();

  for (const account of accounts) {
    const domain = getAccountDomain(account.email);
    if (!domain) continue;

    if (!groups.has(domain)) {
      groups.set(domain, []);
    }

    groups.get(domain).push(account);
  }

  return Array.from(groups.entries()).map(([domain, groupAccounts]) => ({
    domain,
    accounts: groupAccounts,
  }));
}

export function buildAccountStorageState(accounts = [], rules = [], overrides = []) {
  const activeDomains = new Set(
    (rules || []).map(item => getAccountDomain(item.ruleValue)).filter(Boolean),
  );
  const overrideMap = new Map(
    (overrides || []).map(item => [Number(item.accountId), item.displayState]),
  );

  const visibleAccounts = [];
  const collectedAccounts = [];

  for (const account of accounts) {
    const domain = getAccountDomain(account.email);
    const overrideState = overrideMap.get(Number(account.accountId));
    const hasDomainRule = activeDomains.has(domain);
    const isCollected = overrideState === 'collected' || (hasDomainRule && overrideState !== 'visible');

    if (isCollected) {
      collectedAccounts.push(account);
    } else {
      visibleAccounts.push(account);
    }
  }

  return {
    activeDomains,
    overrideMap,
    visibleAccounts,
    collectedAccounts,
    collectedGroups: groupAccountsByDomain(collectedAccounts),
    visibleGroups: groupAccountsByDomain(visibleAccounts),
  };
}
