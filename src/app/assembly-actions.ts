"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  canManageAssembly,
  editableTeamKeys,
  type MonthlyTeamKey,
} from "@/lib/monthly-assembly";
import {
  createMonthlyAssembly,
  fillAssemblyAttendance,
  getMonthlyAssembly,
  saveMonthlyAssemblyForm,
  saveMonthlyTeamForm,
  setMonthlyAssemblyStatus,
} from "@/lib/store/monthly-assemblies";
import { getUserById } from "@/lib/store/users";

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getUserById(session.user.id);
}

function refresh(id?: string) {
  revalidatePath("/assemblies");
  if (id) {
    revalidatePath(`/assemblies/${id}`);
    revalidatePath(`/assemblies/${id}/edit`);
  }
}

export async function createAssembly(fd: FormData) {
  const user = await currentUser();
  if (!user || !canManageAssembly(user)) {
    redirect("/assemblies?error=" + encodeURIComponent("권한이 없습니다."));
  }
  const year = Number(fd.get("year"));
  const month = Number(fd.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    redirect("/assemblies?error=" + encodeURIComponent("연도와 달을 확인해 주세요."));
  }
  try {
    const created = await createMonthlyAssembly({
      year,
      month,
      copyPrevious: fd.get("copyPrevious") === "on",
    });
    refresh(created.id);
    redirect(`/assemblies/${created.id}/edit`);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_EXISTS") {
      redirect("/assemblies?error=" + encodeURIComponent("그 달 월례회가 이미 있습니다."));
    }
    throw error;
  }
}

export async function saveAssembly(id: string, fd: FormData) {
  const user = await currentUser();
  if (!user || !canManageAssembly(user)) return { error: "권한이 없습니다." };
  await saveMonthlyAssemblyForm(id, fd);
  refresh(id);
  redirect(`/assemblies/${id}`);
}

export async function saveTeamSection(id: string, teamKey: MonthlyTeamKey, fd: FormData) {
  const user = await currentUser();
  const assembly = await getMonthlyAssembly(id);
  if (!user || !assembly || !editableTeamKeys(user, assembly).includes(teamKey)) {
    return { error: "이 팀 보고를 수정할 수 없습니다." };
  }
  await saveMonthlyTeamForm(id, teamKey, fd);
  refresh(id);
  redirect(`/assemblies/${id}`);
}

export async function publishAssembly(id: string) {
  const user = await currentUser();
  if (!user || !canManageAssembly(user)) return { error: "권한이 없습니다." };
  await setMonthlyAssemblyStatus(id, "published");
  refresh(id);
}

export async function reopenAssembly(id: string) {
  const user = await currentUser();
  if (!user || !canManageAssembly(user)) return { error: "권한이 없습니다." };
  await setMonthlyAssemblyStatus(id, "draft");
  refresh(id);
}

export async function fillAttendance(id: string) {
  const user = await currentUser();
  if (!user || !canManageAssembly(user)) return { error: "권한이 없습니다." };
  const result = await fillAssemblyAttendance(id);
  refresh(id);
  redirect(`/assemblies/${id}/edit?attendance=${result.filled ? "filled" : "empty"}`);
}
