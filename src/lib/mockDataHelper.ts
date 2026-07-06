// LocalStorage helpers
export const loadData = <T>(key: string, initialData: T): T => {
  if (typeof window === "undefined") return initialData;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialData;
  } catch (error) {
    console.error("Error loading data from localStorage", error);
    return initialData;
  }
};

export const saveData = <T>(key: string, data: T): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data to localStorage", error);
  }
};
