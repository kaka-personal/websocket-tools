class FilterPresetsService {
  constructor() {
    this.storageKey = "websocket-message-filter-presets";
  }

  getPresets() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      const presets = saved ? JSON.parse(saved) : [];
      return Array.isArray(presets) ? presets : [];
    } catch (error) {
      return [];
    }
  }

  savePresets(presets) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(presets));
      return true;
    } catch (error) {
      return false;
    }
  }

  addPreset(preset) {
    const currentPresets = this.getPresets();
    const normalizedName = (preset.name || "").trim();

    if (!normalizedName) {
      return null;
    }

    const existingIndex = currentPresets.findIndex(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
    );

    const nextPreset = {
      id:
        existingIndex >= 0
          ? currentPresets[existingIndex].id
          : `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      filters: {
        direction: preset.filters?.direction || "all",
        text: preset.filters?.text || "",
        invert: Boolean(preset.filters?.invert),
      },
      updatedAt: new Date().toISOString(),
      createdAt:
        existingIndex >= 0
          ? currentPresets[existingIndex].createdAt
          : new Date().toISOString(),
    };

    const nextPresets =
      existingIndex >= 0
        ? currentPresets.map((item, index) =>
            index === existingIndex ? nextPreset : item
          )
        : [nextPreset, ...currentPresets].slice(0, 20);

    if (!this.savePresets(nextPresets)) {
      return null;
    }

    return nextPreset;
  }

  deletePreset(id) {
    const currentPresets = this.getPresets();
    const nextPresets = currentPresets.filter((item) => item.id !== id);
    if (nextPresets.length === currentPresets.length) {
      return false;
    }

    return this.savePresets(nextPresets);
  }
}

const filterPresetsService = new FilterPresetsService();

export default filterPresetsService;
