import { clearAdministratorSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

export async function POST() {
  await clearAdministratorSession();

  return apiSuccess(
    {
      loggedOut: true,
    },
    { status: 200 },
  );
}