const EDGE_ARBITRAGE_RATE_GB = 1.50;
const CARBON_KG_PER_TB = 5.0; 
const ANNUAL_ENTERPRISE_VOLUME_BYTES = 3.05 * 1e12;

export const calculateHonestGreenOps = (originalBytes: number, finalLz4Bytes: number) => {
  if (originalBytes === 0) return { dollarsSaved: 0, co2Prevented: 0, ratio: 1 };

  const realCompressionRatio = finalLz4Bytes / originalBytes;
  const realEfficiencyPercentage = 1 - realCompressionRatio;
  const projectedBytesPrevented = ANNUAL_ENTERPRISE_VOLUME_BYTES * realEfficiencyPercentage;

  const dollarsSaved = (projectedBytesPrevented / 1e9) * EDGE_ARBITRAGE_RATE_GB;
  const co2Prevented = (projectedBytesPrevented / 1e12) * CARBON_KG_PER_TB;

  return { 
    ratio: Math.round(1 / realCompressionRatio), 
    dollarsSaved: parseFloat(dollarsSaved.toFixed(2)), 
    co2Prevented: parseFloat(co2Prevented.toFixed(1)) 
  };
};
