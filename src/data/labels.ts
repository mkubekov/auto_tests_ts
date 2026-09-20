// Human-readable texts the admin panel renders.
//
// Page objects click buttons and pick dropdown options by their visible text, so this module
// is the single place to adapt when the CMS is localised differently. Keys of the option maps
// are API values, values are what the user sees.

export const SAVE = "Save";
export const ADD = "Add";
export const CANCEL = "Cancel";
export const DELETE = "Delete";
export const SUCCESS_LOCATOR = '[id="success"]';
// Forms that submit with a primary button confirm with a toast instead of the inline banner.
export const NOTIFICATION_LOCATOR = ".ant-notification-notice-message";

// Field captions used in test steps and as the anchor for file uploaders.
export const SYSTEM_NAME = "System name";

// Dropdown option labels keyed by API value.
export const BLOCK_COLOR: Readonly<Record<string, string>> = {
  orange: "Orange",
  blue: "Blue",
  green: "Green",
  violet: "Violet",
  grey: "Grey",
  red: "Red",
};

export const BUTTON_ACTION: Readonly<Record<string, string>> = { link: "Link" };

export const BUTTON_STYLE: Readonly<Record<string, string>> = {
  default: "Default",
  outline: "Outline",
};

export const BANNER_POSITION: Readonly<Record<string, string>> = {
  middle: "Below the first screen",
  bottom: "Bottom",
};

export const PROMO_BANNER_POSITION: Readonly<Record<string, string>> = {
  aboveHeader: "Above the header",
  middleOfPage: "Middle of the page",
};

export const PROMO_BUTTON_STYLE: Readonly<Record<string, string>> = {
  withBorder: "With border",
  default: "Default",
};

export const AUDIENCE: Readonly<Record<string, string>> = { guest: "Guests", member: "Members" };

export const MENU_TYPE: Readonly<Record<string, string>> = {
  menuNested: "Nested menu",
  menuWithoutNesting: "Flat menu",
};

export const HEADER_ACTION: Readonly<Record<string, string>> = {
  expandMenu: "Expand (default)",
  link: "Redirect",
};

export const SUBCATEGORY_TYPE: Readonly<Record<string, string>> = {
  list: "Simple list",
  detailedList: "Detailed list",
};

export const SUBCATEGORY_ACTION: Readonly<Record<string, string>> = {
  link: "Redirect",
  noAction: "None (default)",
};

export const BLOCK_TYPE: Readonly<Record<string, string>> = {
  textBlock: "Text block",
  galleryBlock: "Gallery block",
};

export const OFFSET: Readonly<Record<string, string>> = { small: "Narrow", medium: "Regular" };
