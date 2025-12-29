export const isMarketOpen = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
};
