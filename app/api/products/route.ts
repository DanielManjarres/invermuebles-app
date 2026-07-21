import { NextResponse } from "next/server";
import { StockMovementType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProductRequest = {
  category?: string;
  cost?: number;
  details?: string;
  id?: string;
  image?: string;
  name?: string;
  productClass?: string;
  reference?: string;
  salePrice?: number;
  stock?: number;
  visible?: boolean;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function cleanReference(value?: string) {
  return cleanText(value).toUpperCase();
}

function validateProduct(body: ProductRequest, editing = false) {
  const requiredFields = [
    body.name,
    body.reference,
    body.category,
    body.productClass,
    body.details,
  ];

  if (requiredFields.some((field) => cleanText(field).length === 0)) {
    return "Completa los datos principales del producto.";
  }

  if (!Number.isFinite(Number(body.cost)) || Number(body.cost) < 0) {
    return "El costo debe ser un numero valido.";
  }

  if (!Number.isFinite(Number(body.salePrice)) || Number(body.salePrice) < 0) {
    return "El precio de venta debe ser un numero valido.";
  }

  if (!editing && (!Number.isFinite(Number(body.stock)) || Number(body.stock) < 0)) {
    return "El stock inicial debe ser un numero valido.";
  }

  return "";
}

async function findOrCreateTaxonomy(category: string, productClass: string) {
  const productType = await prisma.productType.upsert({
    where: { name: category },
    update: {},
    create: { name: category },
  });

  const savedClass = await prisma.productClass.upsert({
    where: {
      name_productTypeId: {
        name: productClass,
        productTypeId: productType.id,
      },
    },
    update: {},
    create: {
      name: productClass,
      productTypeId: productType.id,
    },
  });

  return { productClassId: savedClass.id, productTypeId: productType.id };
}

async function getAdminUserId() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@invermuebles.com" },
    update: { active: true, name: "Administrador", role: UserRole.ADMIN },
    create: {
      active: true,
      email: "admin@invermuebles.com",
      name: "Administrador",
      role: UserRole.ADMIN,
    },
  });

  return admin.id;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductRequest;
  const validationError = validateProduct(body);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const reference = cleanReference(body.reference);
  const existingProduct = await prisma.product.findUnique({ where: { reference } });

  if (existingProduct) {
    return NextResponse.json(
      { message: "Ya existe un producto con esa referencia." },
      { status: 409 }
    );
  }

  const category = cleanText(body.category);
  const productClass = cleanText(body.productClass);
  const stock = Number(body.stock);
  const taxonomy = await findOrCreateTaxonomy(category, productClass);
  const adminUserId = await getAdminUserId();

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        id: body.id,
        name: cleanText(body.name),
        reference,
        details: cleanText(body.details),
        cost: String(Number(body.cost)),
        salePrice: String(Number(body.salePrice)),
        stock,
        visible: Boolean(body.visible),
        imageUrl: cleanText(body.image),
        productClassId: taxonomy.productClassId,
        productTypeId: taxonomy.productTypeId,
      },
    });

    if (stock > 0) {
      await tx.stockMovement.create({
        data: {
          nextStock: stock,
          note: "Producto creado desde gestion de productos",
          previousStock: 0,
          productId: createdProduct.id,
          quantity: stock,
          reason: "Inventario inicial",
          type: StockMovementType.ADJUSTMENT,
          userId: adminUserId,
        },
      });
    }

    return createdProduct;
  });

  return NextResponse.json({ id: product.id }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ProductRequest;
  const validationError = validateProduct(body, true);

  if (validationError || !body.id) {
    return NextResponse.json(
      { message: validationError || "No se encontro el producto a editar." },
      { status: 400 }
    );
  }

  const reference = cleanReference(body.reference);
  const productWithSameReference = await prisma.product.findUnique({
    where: { reference },
  });

  if (productWithSameReference && productWithSameReference.id !== body.id) {
    return NextResponse.json(
      { message: "Ya existe otro producto con esa referencia." },
      { status: 409 }
    );
  }

  const category = cleanText(body.category);
  const productClass = cleanText(body.productClass);
  const taxonomy = await findOrCreateTaxonomy(category, productClass);

  await prisma.product.update({
    where: { id: body.id },
    data: {
      name: cleanText(body.name),
      reference,
      details: cleanText(body.details),
      cost: String(Number(body.cost)),
      salePrice: String(Number(body.salePrice)),
      visible: Boolean(body.visible),
      imageUrl: cleanText(body.image),
      productClassId: taxonomy.productClassId,
      productTypeId: taxonomy.productTypeId,
    },
  });

  return NextResponse.json({ id: body.id });
}
