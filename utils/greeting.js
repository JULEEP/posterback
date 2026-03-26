export const getGreeting = (name = "Friend") => {
  const hour = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  });

  const currentHour = parseInt(hour);

  if (currentHour >= 5 && currentHour < 12) {
    return `🌞 Good Morning ${name}`;
  }

  if (currentHour >= 12 && currentHour < 17) {
    return `☀️ Good Afternoon ${name}`;
  }

  if (currentHour >= 17 && currentHour < 21) {
    return `🌆 Good Evening ${name}`;
  }

  return `🌙 Good Night ${name}`;
};