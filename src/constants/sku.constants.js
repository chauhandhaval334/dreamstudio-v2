const skuDurations = {
  'a1_3_days': 3,
  'a1_weekly': 7,
  'a1_monthly': 30,
  'a2_monthly': 30,
  'c1_weekly': 7,
  'c2_weekly': 7,
  'c1_monthly': 30,
  'c1_yearly': 365
};

const skuTokens = {
  'a1_3_days': { total_token: 50, available_token: 50 },
  'a1_weekly': { total_token: 100, available_token: 100 },
  'a1_monthly': { total_token: 500, available_token: 500 },
  'a2_monthly': { total_token: 1000, available_token: 1000 },
  'c1_weekly': { total_token: 1000, available_token: 1000 },
  'c2_weekly': { total_token: 1000, available_token: 1000 },
  'c1_monthly': { total_token: 9999999, available_token: 9999999 },
  'c1_yearly': { total_token: 9999999, available_token: 9999999 },
  'p1_25_images': { total_token: 25, available_token: 25 },
  'p2_25_images': { total_token: 25, available_token: 25 },
  'p1_50_images': { total_token: 50, available_token: 50 },
  'p2_50_images': { total_token: 50, available_token: 50 },
  'p1_100_images': { total_token: 100, available_token: 100 },
  'p2_100_images': { total_token: 100, available_token: 100 },
  'p1_300_images': { total_token: 300, available_token: 300 },
  'p1_500_images': { total_token: 500, available_token: 500 },
  'p2_500_images': { total_token: 500, available_token: 500 },
  'p1_1000_images': { total_token: 1000, available_token: 1000 },
  'p2_1000_images': { total_token: 1000, available_token: 1000 },
  'p1_2000_images': { total_token: 2000, available_token: 2000 },
  'p1_5000_images': { total_token: 5000, available_token: 5000 },
  'p1_10000_images': { total_token: 10000, available_token: 10000 },
  'p1_100_credits': { total_token: 100, available_token: 100 },
  'p1_300_credits': { total_token: 300, available_token: 300 },
  'p1_500_credits': { total_token: 500, available_token: 500 },
  'p1_1000_credits': { total_token: 1000, available_token: 1000 }
};

module.exports = {
  skuDurations,
  skuTokens
};
