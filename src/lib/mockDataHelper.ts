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

    // Auto logging for data changes
    if (key !== "sim_tpq_audit_logs" && key.startsWith("sim_tpq_")) {
      const loggedUser = window.localStorage.getItem("sim_tpq_logged_user") || "system";
      const loggedRole = window.localStorage.getItem("sim_tpq_logged_role") || "System";
      
      let featureName = "";
      switch (key) {
        case "sim_tpq_generus": featureName = "Siswa (Generus)"; break;
        case "sim_tpq_kelompok": featureName = "Unit Kelompok"; break;
        case "sim_tpq_mubaligh_setempat": featureName = "Mubaligh Setempat"; break;
        case "sim_tpq_mubaligh_tugasan": featureName = "Mubaligh Tugasan"; break;
        case "sim_tpq_pengurus": featureName = "Pengurus"; break;
        case "sim_tpq_presensi": featureName = "Presensi Santri"; break;
        case "sim_tpq_raport": featureName = "Raport Santri"; break;
        case "sim_tpq_kurikulum": featureName = "Kurikulum"; break;
        case "sim_tpq_sarpras": featureName = "Sarana Prasarana"; break;
        case "sim_tpq_gallery": featureName = "Galeri Kegiatan"; break;
        case "sim_tpq_announcements": featureName = "Pengumuman"; break;
        case "sim_tpq_wa_templates": featureName = "WhatsApp Template"; break;
        case "sim_tpq_documents": featureName = "Dokumen"; break;
        case "sim_tpq_kegiatan": featureName = "Kegiatan"; break;
        default: featureName = key.replace("sim_tpq_", "");
      }
      
      const auditKey = "sim_tpq_audit_logs";
      const existingLogsStr = window.localStorage.getItem(auditKey);
      let logs: any[] = [];
      if (existingLogsStr) {
        try {
          logs = JSON.parse(existingLogsStr);
        } catch(e) {
          logs = [];
        }
      }
      
      const now = new Date();
      const dateStr = now.getFullYear() + "-" + 
                      String(now.getMonth() + 1).padStart(2, "0") + "-" + 
                      String(now.getDate()).padStart(2, "0");
      const timeStr = String(now.getHours()).padStart(2, "0") + ":" + 
                      String(now.getMinutes()).padStart(2, "0") + ":" + 
                      String(now.getSeconds()).padStart(2, "0");
      
      const newLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: loggedUser,
        role: loggedRole,
        aktivitas: `Mengubah data pada fitur ${featureName}`,
        ipAddress: "192.168.1.101",
        perangkat: navigator.userAgent.substring(0, 50) || "Browser",
        tanggal: dateStr,
        jam: timeStr
      };
      
      logs.unshift(newLog);
      if (logs.length > 100) logs = logs.slice(0, 100);
      window.localStorage.setItem(auditKey, JSON.stringify(logs));
    }
  } catch (error) {
    console.error("Error saving data to localStorage", error);
  }
};
