// Sector-relative peer ranking. Comparing a foundry to an equipment maker
// by 30-day % change is meaningless — different business models move on
// different signals — so ranking is scoped to companies sharing a primary
// sector, not the full tracked list.

// A few tracked companies have compound sector labels (Intel is
// "IDM / Foundry", Samsung is "IDM / Foundry / Memory") because they
// operate across multiple business lines. For ranking purposes each is
// reduced to one primary peer-comparison bucket: "IDM" is a qualifier, not
// its own bucket, and when the remaining tokens span more than one real
// bucket, Foundry takes priority over Memory over Equipment — the
// highest-visibility business line for the IDM/foundry hybrids currently
// in this dataset (Intel, Samsung). "Fabless / Accelerators" is kept as a
// single atomic bucket since it names one cohesive peer group (Nvidia,
// AMD), not two separate ones.
function primarySector(sector) {
  if (sector === 'Fabless / Accelerators') return sector
  const tokens = sector.split(' / ').filter((t) => t !== 'IDM')
  if (tokens.includes('Foundry')) return 'Foundry'
  if (tokens.includes('Memory')) return 'Memory'
  if (tokens.includes('Equipment')) return 'Equipment'
  return sector
}

// Ranks a company against other tracked companies in the same primary
// sector by 30-day % change (descending). Returns null if either argument
// is missing. When the company is the only tracked one in its sector,
// `solo` is true instead of returning a "#1 of 1" rank.
export function getSectorRank(company, allCompanies) {
  if (!company || !allCompanies?.length) return null

  const bucket = primarySector(company.sector)
  const peers = allCompanies.filter((c) => primarySector(c.sector) === bucket)

  if (peers.length <= 1) {
    return { bucket, rank: 1, total: 1, solo: true }
  }

  const ranked = [...peers].sort((a, b) => b.change30d - a.change30d)
  const rank = ranked.findIndex((c) => c.ticker === company.ticker) + 1

  return { bucket, rank, total: peers.length, solo: false }
}

function sectorLabelPlural(bucket) {
  switch (bucket) {
    case 'Foundry':
      return 'foundries'
    case 'Equipment':
      return 'equipment makers'
    case 'Memory':
      return 'memory makers'
    case 'Fabless / Accelerators':
      return 'fabless / accelerator companies'
    default:
      return `${bucket.toLowerCase()} companies`
  }
}

// Formats a getSectorRank() result into the display string used across the
// app, e.g. "#2 of 3 tracked foundries" or "Only tracked company in Memory".
export function formatSectorRank(result) {
  if (!result) return null
  if (result.solo) return `Only tracked company in ${result.bucket}`
  return `#${result.rank} of ${result.total} tracked ${sectorLabelPlural(result.bucket)}`
}
