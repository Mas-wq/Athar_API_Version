export const formatCountdown = (dateValue, now = Date.now()) => {
  const remaining = new Date(dateValue).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Ended";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export const describeMinutes = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return "";
  if (value >= 1440 && value % 1440 === 0) return `${value / 1440} day${value === 1440 ? "" : "s"}`;
  if (value >= 60 && value % 60 === 0) return `${value / 60} hour${value === 60 ? "" : "s"}`;
  const days = Math.floor(value / 1440);
  const hours = Math.floor((value % 1440) / 60);
  const mins = value % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", mins ? `${mins}m` : ""].filter(Boolean).join(" ") || "0 minutes";
};
