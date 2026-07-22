import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type VisibilityRequest = {
  visible?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const body = (await request.json()) as VisibilityRequest;

  if (typeof body.visible !== "boolean") {
    return NextResponse.json(
      { message: "Indica si el producto queda visible u oculto." },
      { status: 400 }
    );
  }

  await prisma.product.update({
    where: { id },
    data: { visible: body.visible },
  });

  return NextResponse.json({ id, visible: body.visible });
}
