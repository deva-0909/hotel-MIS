"use client";

import { useTransition } from "react";
import { getGuestDocumentUrl, deleteGuestDocument } from "@/app/actions/guests";

export function DocumentViewButton({ filePath }: { filePath: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-accent hover:underline"
      onClick={() =>
        startTransition(async () => {
          try {
            const url = await getGuestDocumentUrl(filePath);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (err) {
            alert(err instanceof Error ? err.message : "Could not open document");
          }
        })
      }
    >
      View
    </button>
  );
}

export function DeleteDocumentButton({ documentId, guestId, filePath }: { documentId: string; guestId: string; filePath: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-gray-400 hover:text-red-600"
      onClick={() => {
        if (confirm("Delete this document?")) startTransition(() => deleteGuestDocument(documentId, guestId, filePath));
      }}
    >
      Delete
    </button>
  );
}
