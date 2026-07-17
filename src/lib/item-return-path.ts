const ITEM_RETURN_PATH = /^\/item\/([A-Za-z0-9_-]{1,128})$/;

export type ItemReturnPath = {
  itemId: string;
  path: string;
};

export function parseItemReturnPath(
  value: string | string[] | undefined,
): ItemReturnPath | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;

  const match = ITEM_RETURN_PATH.exec(candidate);
  if (!match) return null;

  return {
    itemId: match[1],
    path: candidate,
  };
}
