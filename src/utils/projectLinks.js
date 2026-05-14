export const PROJECT_LINKS = {
  homepage: "",
  repository: "",
  chromeStore: "",
  edgeStore: "",
  documentation: "",
  videoDemo: "",
};

export const hasProjectLink = (key) => Boolean(PROJECT_LINKS[key]);

export const openProjectLink = (key) => {
  const url = PROJECT_LINKS[key];

  if (!url) {
    return false;
  }

  chrome.tabs.create({ url });
  return true;
};
