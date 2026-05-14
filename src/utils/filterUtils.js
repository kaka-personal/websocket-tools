/**
 * Filter messages based on direction, text content, and invert option
 * @param {Array} messages - Array of message objects
 * @param {Object} filters - Filter configuration
 * @param {string} filters.direction - 'all', 'outgoing', or 'incoming'
 * @param {string} filters.text - Text to filter by
 * @param {boolean} filters.invert - Whether to invert the text filter
 * @returns {Array} Filtered messages
 */
export const analyzeFilterPattern = (text = "") => {
  const trimmedText = text.trim();
  const regexPrefixMatch = trimmedText.match(/^(?:re|regex):(.*)$/is);

  if (!trimmedText) {
    return {
      mode: "empty",
      text: "",
      regex: null,
      error: null,
    };
  }

  const createRegexPattern = (pattern, flags = "", isExplicit = false) => {
    try {
      return {
        mode: "regex",
        text: trimmedText,
        regex: new RegExp(pattern, flags),
        error: null,
      };
    } catch (error) {
      if (!isExplicit) {
        return null;
      }

      return {
        mode: "invalid-regex",
        text: trimmedText,
        regex: null,
        error: error.message,
      };
    }
  };

  if (trimmedText.startsWith("/") && trimmedText.lastIndexOf("/") > 0) {
    const lastSlashIndex = trimmedText.lastIndexOf("/");
    const pattern = trimmedText.slice(1, lastSlashIndex);
    const flags = trimmedText.slice(lastSlashIndex + 1);
    const regexPattern = createRegexPattern(pattern, flags, true);
    if (regexPattern) {
      return regexPattern;
    }
  }

  if (regexPrefixMatch) {
    const regexPattern = createRegexPattern(regexPrefixMatch[1], "", true);
    if (regexPattern) {
      return regexPattern;
    }
  }

  const looksLikeRawRegex =
    /(^\^)|(\$$)|\\[dDsSwWbBtrnvf0]|(\.\*)|(\.\+)|(\[[^\]]*\])|(\{\d+,?\d*\})|(\|)|(\(\?:)|(\(\?=)|(\(\?!)/.test(
      trimmedText
    );

  if (looksLikeRawRegex) {
    const regexPattern = createRegexPattern(trimmedText);
    if (regexPattern) {
      return regexPattern;
    }
  }

  return {
    mode: "text",
    text: trimmedText.toLowerCase(),
    regex: null,
    error: null,
  };
};

const normalizeFilterValue = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const matchesFilterPattern = (value, filterPattern) => {
  if (filterPattern.mode === "empty") {
    return true;
  }

  const normalizedValue = normalizeFilterValue(value);

  if (filterPattern.mode === "regex") {
    filterPattern.regex.lastIndex = 0;
    return filterPattern.regex.test(normalizedValue);
  }

  if (filterPattern.mode === "invalid-regex") {
    return false;
  }

  return normalizedValue.toLowerCase().includes(filterPattern.text);
};

export const filterMessages = (messages, filters) => {
  const { direction = "all", text = "", invert = false } = filters;
  const filterPattern = analyzeFilterPattern(text);

  return (
    messages
      .filter((msg) => {
        // Direction filter
        if (direction !== "all" && msg.direction !== direction) {
          return false;
        }

        // Text content filter
        if (filterPattern.mode !== "empty") {
          const matchesText = matchesFilterPattern(msg.data, filterPattern);

          // Apply invert logic
          if (invert) {
            return !matchesText; // Show messages that DON'T contain the text
          } else {
            return matchesText; // Show messages that DO contain the text
          }
        }

        return true;
      })
      // Remove duplicates using Set for O(n) performance
      .filter((msg, index, arr) => {
        if (index === 0) {
          arr._seenKeys = new Set();
        }
        const key = `${msg.timestamp}|${msg.data}|${msg.direction}`;
        if (arr._seenKeys.has(key)) {
          return false;
        }
        arr._seenKeys.add(key);
        return true;
      })
      // Sort by timestamp (newest first)
      .sort((a, b) => b.timestamp - a.timestamp)
  );
};

/**
 * Filter connections based on URL and invert option
 * @param {Array} connections - Array of connection objects
 * @param {Object} filters - Filter configuration
 * @param {string} filters.text - Text to filter by
 * @param {boolean} filters.invert - Whether to invert the filter
 * @returns {Array} Filtered connections
 */
export const filterConnections = (connections, filters) => {
  const { text = "", invert = false } = filters;
  const filterPattern = analyzeFilterPattern(text);

  if (filterPattern.mode === "empty") {
    return connections;
  }

  return connections.filter((conn) => {
    const urlMatches = matchesFilterPattern(conn.url, filterPattern);
    const idMatches = matchesFilterPattern(conn.id, filterPattern);
    const matches = urlMatches || idMatches;

    return invert ? !matches : matches;
  });
};
