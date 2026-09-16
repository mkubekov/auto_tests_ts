// Enumerations shared by models, page objects and tests.
//
// `as const` objects rather than TS `enum`s: they erase to plain objects, accept the API's
// plain strings without casts, and plug straight into `z.enum()` and `faker.helpers.enumValue()`.

type ValueOf<T> = T[keyof T];

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const;
export type HttpStatus = ValueOf<typeof HttpStatus>;

/** Colour scheme of a content block. Must match the admin panel dropdown 1:1. */
export const BlockColor = {
  ORANGE: "orange",
  BLUE: "blue",
  GREEN: "green",
  VIOLET: "violet",
  GREY: "grey",
  RED: "red",
} as const;
export type BlockColor = ValueOf<typeof BlockColor>;

export const ButtonStyle = { DEFAULT: "default", OUTLINE: "outline" } as const;
export type ButtonStyle = ValueOf<typeof ButtonStyle>;

export const ButtonAction = { LINK: "link" } as const;
export type ButtonAction = ValueOf<typeof ButtonAction>;

export const BannerPosition = { MIDDLE: "middle", BOTTOM: "bottom" } as const;
export type BannerPosition = ValueOf<typeof BannerPosition>;

export const PromoBannerPosition = {
  ABOVE_HEADER: "aboveHeader",
  MIDDLE_OF_PAGE: "middleOfPage",
} as const;
export type PromoBannerPosition = ValueOf<typeof PromoBannerPosition>;

export const PromoButtonStyle = { WITH_BORDER: "withBorder", DEFAULT: "default" } as const;
export type PromoButtonStyle = ValueOf<typeof PromoButtonStyle>;

/** Who sees a promo banner. */
export const Audience = { GUEST: "guest", MEMBER: "member" } as const;
export type Audience = ValueOf<typeof Audience>;

export const MenuType = { NESTED: "menuNested", FLAT: "menuWithoutNesting" } as const;
export type MenuType = ValueOf<typeof MenuType>;

export const HeaderActionType = { EXPAND: "expandMenu", LINK: "link" } as const;
export type HeaderActionType = ValueOf<typeof HeaderActionType>;

export const SubcategoryType = { LIST: "list", DETAILED_LIST: "detailedList" } as const;
export type SubcategoryType = ValueOf<typeof SubcategoryType>;

export const SubcategoryAction = { LINK: "link", NONE: "noAction" } as const;
export type SubcategoryAction = ValueOf<typeof SubcategoryAction>;

/** Reference dictionaries the CMS exposes through one `handbooks` endpoint. */
export const HandbookType = { CATEGORIES: "categories", LABELS: "labels" } as const;
export type HandbookType = ValueOf<typeof HandbookType>;

export const Font = { SANS: "HelveticaNeueCyr", MONO: "CascadiaCode" } as const;
export type Font = ValueOf<typeof Font>;
