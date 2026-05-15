class FilterPresetsService {
  constructor() {
    this.storageKey = "websocket-message-filter-presets";
  }

  generatePresetId() {
    return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

    const normalizedNameKey = normalizedName.toLowerCase();
    const normalizedDirection = preset.filters?.direction || "all";
    const normalizedText = preset.filters?.text || "";
    const normalizedInvert = Boolean(preset.filters?.invert);
    const isDuplicate = currentPresets.some((item) => {
      const itemName = (item.name || "").trim().toLowerCase();
      const itemDirection = item.filters?.direction || "all";
      const itemText = item.filters?.text || "";
      const itemInvert = Boolean(item.filters?.invert);

      return (
        itemName === normalizedNameKey ||
        (itemDirection === normalizedDirection &&
          itemText === normalizedText &&
          itemInvert === normalizedInvert)
      );
    });

    if (isDuplicate) {
      return null;
    }

    const nextPreset = {
      id: this.generatePresetId(),
      name: normalizedName,
      filters: {
        direction: normalizedDirection,
        text: normalizedText,
        invert: normalizedInvert,
      },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const nextPresets = [nextPreset, ...currentPresets].slice(0, 20);

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
