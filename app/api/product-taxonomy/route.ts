import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type TaxonomyAction =
  | "createType"
  | "createClass"
  | "renameType"
  | "deleteType"
  | "renameClass"
  | "deleteClass";

type TaxonomyRequest = {
  action?: TaxonomyAction;
  className?: string;
  nextClassName?: string;
  nextTypeName?: string;
  typeName?: string;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

async function findType(typeName: string) {
  return prisma.productType.findUnique({
    where: { name: typeName },
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as TaxonomyRequest;
  const typeName = cleanText(body.typeName);
  const className = cleanText(body.className);
  const nextTypeName = cleanText(body.nextTypeName);
  const nextClassName = cleanText(body.nextClassName);

  if (!body.action) {
    return NextResponse.json(
      { message: "Indica la accion a realizar." },
      { status: 400 }
    );
  }

  if (body.action === "createType") {
    if (!typeName) {
      return NextResponse.json(
        { message: "Escribe el nombre del tipo." },
        { status: 400 }
      );
    }

    const existingType = await findType(typeName);
    if (existingType) {
      return NextResponse.json(
        { message: "Ese tipo ya esta registrado." },
        { status: 409 }
      );
    }

    const existingClass = await prisma.productClass.findFirst({
      where: {
        name: {
          equals: typeName,
          mode: "insensitive",
        },
      },
    });

    if (existingClass) {
      return NextResponse.json(
        {
          message:
            "Ese nombre ya esta registrado como clase. Agregalo dentro de un tipo, no como tipo nuevo.",
        },
        { status: 409 }
      );
    }

    await prisma.productType.create({ data: { name: typeName } });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.action === "createClass") {
    if (!typeName || !className) {
      return NextResponse.json(
        { message: "Selecciona un tipo y escribe la clase." },
        { status: 400 }
      );
    }

    const productType = await findType(typeName);
    if (!productType) {
      return NextResponse.json(
        { message: "El tipo seleccionado no existe." },
        { status: 404 }
      );
    }

    if (productType.name.toLowerCase() === className.toLowerCase()) {
      return NextResponse.json(
        { message: "La clase no puede tener el mismo nombre del tipo." },
        { status: 400 }
      );
    }

    const existingClass = await prisma.productClass.findUnique({
      where: {
        name_productTypeId: {
          name: className,
          productTypeId: productType.id,
        },
      },
    });

    if (existingClass) {
      return NextResponse.json(
        { message: "Esa clase ya esta registrada en ese tipo." },
        { status: 409 }
      );
    }

    await prisma.productClass.create({
      data: {
        name: className,
        productTypeId: productType.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.action === "renameType") {
    if (!typeName || !nextTypeName) {
      return NextResponse.json(
        { message: "Escribe el nuevo nombre del tipo." },
        { status: 400 }
      );
    }

    const productType = await findType(typeName);
    if (!productType) {
      return NextResponse.json(
        { message: "El tipo seleccionado no existe." },
        { status: 404 }
      );
    }

    const existingType = await findType(nextTypeName);
    if (existingType && existingType.id !== productType.id) {
      return NextResponse.json(
        { message: "Ya existe un tipo con ese nombre." },
        { status: 409 }
      );
    }

    await prisma.productType.update({
      where: { id: productType.id },
      data: { name: nextTypeName },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteType") {
    if (!typeName) {
      return NextResponse.json(
        { message: "Indica el tipo que quieres eliminar." },
        { status: 400 }
      );
    }

    const productType = await findType(typeName);
    if (!productType) {
      return NextResponse.json(
        { message: "El tipo seleccionado no existe." },
        { status: 404 }
      );
    }

    const productCount = await prisma.product.count({
      where: { productTypeId: productType.id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { message: "No puedes eliminar un tipo que tiene productos registrados." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.productClass.deleteMany({ where: { productTypeId: productType.id } }),
      prisma.productType.delete({ where: { id: productType.id } }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (body.action === "renameClass") {
    if (!typeName || !className || !nextClassName) {
      return NextResponse.json(
        { message: "Completa los datos de la clase." },
        { status: 400 }
      );
    }

    const productType = await findType(typeName);
    if (!productType) {
      return NextResponse.json(
        { message: "El tipo seleccionado no existe." },
        { status: 404 }
      );
    }

    const productClass = await prisma.productClass.findUnique({
      where: {
        name_productTypeId: {
          name: className,
          productTypeId: productType.id,
        },
      },
    });

    if (!productClass) {
      return NextResponse.json(
        { message: "La clase seleccionada no existe." },
        { status: 404 }
      );
    }

    const existingClass = await prisma.productClass.findUnique({
      where: {
        name_productTypeId: {
          name: nextClassName,
          productTypeId: productType.id,
        },
      },
    });

    if (existingClass && existingClass.id !== productClass.id) {
      return NextResponse.json(
        { message: "Ya existe una clase con ese nombre en este tipo." },
        { status: 409 }
      );
    }

    await prisma.productClass.update({
      where: { id: productClass.id },
      data: { name: nextClassName },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteClass") {
    if (!typeName || !className) {
      return NextResponse.json(
        { message: "Indica la clase que quieres eliminar." },
        { status: 400 }
      );
    }

    const productType = await findType(typeName);
    if (!productType) {
      return NextResponse.json(
        { message: "El tipo seleccionado no existe." },
        { status: 404 }
      );
    }

    const productClass = await prisma.productClass.findUnique({
      where: {
        name_productTypeId: {
          name: className,
          productTypeId: productType.id,
        },
      },
    });

    if (!productClass) {
      return NextResponse.json(
        { message: "La clase seleccionada no existe." },
        { status: 404 }
      );
    }

    const productCount = await prisma.product.count({
      where: { productClassId: productClass.id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { message: "No puedes eliminar una clase que tiene productos registrados." },
        { status: 400 }
      );
    }

    await prisma.productClass.delete({ where: { id: productClass.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { message: "Accion no reconocida." },
    { status: 400 }
  );
}
