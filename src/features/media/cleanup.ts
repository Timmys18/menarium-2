import { deleteStoredUpload } from "@/lib/storage";

export async function deleteMediaObjects(keys: Array<string | null | undefined>) {
  await Promise.all(
    [...new Set(keys.filter((key): key is string => Boolean(key)))].map(async (key) => {
      try {
        await deleteStoredUpload(key);
      } catch (error) {
        console.error(`[media] failed to delete ${key}:`, error);
      }
    }),
  );
}
