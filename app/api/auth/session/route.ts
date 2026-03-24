import { apiSuccess, requireAuthenticatedAdministrator } from "@/lib/api";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  return apiSuccess(
    {
      administrator,
    },
    { status: 200 },
  );
}