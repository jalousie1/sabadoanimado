const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  purple: "\x1b[35m"
};

const colorful = (color, text) => {
  if (!color) return text;
  return color + text + '\x1b[0m';
};

module.exports = { colors, colorful };
