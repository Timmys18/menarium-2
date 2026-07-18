import { deleteStoredUpload } from "@/lib/storage";
import { reportError } from "@/lib/logger";

export async function deleteMediaObjects(keys: Array<string | null | undefined>) {
  await Promise.all(
    [...new Set(keys.filter((key): key is string => Boolean(key)))].map(async (key) => {
      try {
        await deleteStoredUpload(key);
      } catch (error) {
        reportError("media.object_delete_failed", error, { storageKey: key });
      }
    }),
  );
}
