"use client";

import type { User } from "@/lib/types";
import { roleLabel } from "@/lib/format";

type Props = {
  users: User[];
  defaultSelectedIds?: string[];
};

export function AnnouncementUserPicker({ users, defaultSelectedIds = [] }: Props) {
  const selected = new Set(defaultSelectedIds);

  return (
    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
      {users.map((u) => (
        <label
          key={u.id}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
        >
          <input
            type="checkbox"
            name="selectedUserIds"
            value={u.id}
            defaultChecked={selected.has(u.id)}
            className="rounded border-input"
          />
          <span className="font-medium">{u.name}</span>
          <span className="text-muted-foreground">
            {roleLabel(u.role)}
            {u.officerTitle ? ` · ${u.officerTitle}` : ""}
          </span>
        </label>
      ))}
      {users.length === 0 && (
        <p className="px-2 py-2 text-sm text-muted-foreground">선택할 로그인 사용자가 없습니다.</p>
      )}
    </div>
  );
}
