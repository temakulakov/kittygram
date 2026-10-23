export const COLORS = [
  { hex: "#FFE4C4", name: "bisque", title: "Бисквитный" },
  { hex: "#DEB887", name: "burlywood", title: "Песочный" },
  { hex: "#FFA500", name: "orange", title: "Рыжий" },
  { hex: "#FF8C00", name: "darkorange", title: "Тёмно-рыжий" },
  { hex: "#D2691E", name: "chocolate", title: "Шоколадный" },
  { hex: "#8B4513", name: "saddlebrown", title: "Коричневый" },
  { hex: "#FFFFFF", name: "white", title: "Белый" },
  { hex: "#F5F5F5", name: "whitesmoke", title: "Дымчато-белый" },
  { hex: "#DCDCDC", name: "gainsboro", title: "Светло-серый" },
  { hex: "#A9A9A9", name: "darkgray", title: "Серый" },
  { hex: "#808080", name: "gray", title: "Тёмно-серый" },
  { hex: "#000000", name: "black", title: "Чёрный" },
];

const ALIASES = { darkgrey: "darkgray", grey: "gray" };

export const colorInfo = (name) => {
  const key = ALIASES[name] || name;
  return (
    COLORS.find((color) => color.name === key) || {
      hex: "#EEEEEE",
      name,
      title: name || "—",
    }
  );
};

export const isDark = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 < 140;
};

export const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const ageText = (age) => {
  if (age === 0) return "меньше года";
  return `${age} ${plural(age, "год", "года", "лет")}`;
};

export const formatDate = (iso, options = {}) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const dayMonth = (iso) => {
  const date = new Date(iso);
  return {
    day: date.getDate(),
    month: date.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
    weekday: date.toLocaleString("ru-RU", { weekday: "short" }),
  };
};

export const toLocalInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
};

export const fromLocalInput = (value) =>
  value ? new Date(value).toISOString() : "";

export const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

export const fieldErrors = (error) => {
  const data = (error && error.data) || {};
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    result[key] = Array.isArray(value) ? value.join(" ") : String(value);
  });
  return result;
};
