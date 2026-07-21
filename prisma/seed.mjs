import { PrismaClient, StockMovementType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const initialProducts = [
  {
    id: "sala-modular-gris",
    name: "Sala modular gris",
    reference: "MUE-001",
    category: "Muebles",
    productClass: "Sala",
    details: "Sala modular para espacios familiares, tapizada en tela gris.",
    cost: 1500000,
    salePrice: 2100000,
    stock: 2,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "nevera-dos-puertas",
    name: "Nevera dos puertas",
    reference: "REF-NEV-220",
    category: "Electrodomesticos",
    productClass: "Nevera",
    details: "Nevera familiar con congelador superior y bajo consumo.",
    cost: 1800000,
    salePrice: 2450000,
    stock: 1,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "comedor-seis-puestos",
    name: "Comedor seis puestos",
    reference: "MUE-014",
    category: "Muebles",
    productClass: "Comedor",
    details: "Comedor en madera con seis sillas tapizadas.",
    cost: 1200000,
    salePrice: 1750000,
    stock: 3,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "lavadora-automatica",
    name: "Lavadora automatica",
    reference: "REF-LAV-016",
    category: "Electrodomesticos",
    productClass: "Lavadora",
    details: "Lavadora automatica de carga superior para uso familiar.",
    cost: 1350000,
    salePrice: 1880000,
    stock: 0,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "colchon-doble",
    name: "Colchon doble",
    reference: "COL-120",
    category: "Colchones",
    productClass: "Colchon",
    details: "Colchon doble con soporte medio y tela acolchada.",
    cost: 430000,
    salePrice: 690000,
    stock: 5,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "mueble-tv",
    name: "Mueble para TV",
    reference: "MUE-032",
    category: "Muebles",
    productClass: "Mueble para TV",
    details: "Centro de entretenimiento compacto con espacio de almacenamiento.",
    cost: 320000,
    salePrice: 520000,
    stock: 4,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1616627561839-074385245ff6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "televisor-smart-55",
    name: "Televisor Smart TV 55 pulgadas",
    reference: "REF-TV-055",
    category: "Electrodomesticos",
    productClass: "Televisor",
    details: "Televisor Smart TV de 55 pulgadas con imagen 4K y conexion WiFi.",
    cost: 1450000,
    salePrice: 2150000,
    stock: 2,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "sala-estar-verde",
    name: "Sala de estar verde",
    reference: "MUE-045",
    category: "Muebles",
    productClass: "Sala",
    details: "Juego de sala para estar con sofa principal, poltrona y mesa auxiliar.",
    cost: 1900000,
    salePrice: 2750000,
    stock: 1,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "bafle-bluetooth",
    name: "Bafle Bluetooth portatil",
    reference: "AUD-018",
    category: "Audio y video",
    productClass: "Bafle",
    details: "Bafle recargable con conexion Bluetooth, puerto USB y microfono.",
    cost: 280000,
    salePrice: 430000,
    stock: 6,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "equipo-sonido-hogar",
    name: "Equipo de sonido para hogar",
    reference: "AUD-026",
    category: "Audio y video",
    productClass: "Equipo de sonido",
    details: "Sistema de sonido para sala con parlantes y conectividad inalambrica.",
    cost: 620000,
    salePrice: 890000,
    stock: 3,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "estufa-horno",
    name: "Estufa con horno",
    reference: "REF-EST-030",
    category: "Electrodomesticos",
    productClass: "Estufa",
    details: "Estufa de piso con horno integrado, ideal para uso familiar.",
    cost: 780000,
    salePrice: 1120000,
    stock: 2,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "poltrona-reclinable",
    name: "Poltrona reclinable",
    reference: "MUE-052",
    category: "Muebles",
    productClass: "Poltrona",
    details: "Poltrona comoda para sala de estar con sistema reclinable.",
    cost: 520000,
    salePrice: 820000,
    stock: 4,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=80",
  },
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@invermuebles.com" },
    update: {
      name: "Administrador",
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      email: "admin@invermuebles.com",
      name: "Administrador",
      role: UserRole.ADMIN,
      active: true,
    },
  });

  for (const product of initialProducts) {
    const productType = await prisma.productType.upsert({
      where: { name: product.category },
      update: {},
      create: { name: product.category },
    });

    const productClass = await prisma.productClass.upsert({
      where: {
        name_productTypeId: {
          name: product.productClass,
          productTypeId: productType.id,
        },
      },
      update: {},
      create: {
        name: product.productClass,
        productTypeId: productType.id,
      },
    });

    const existingProduct = await prisma.product.findUnique({
      where: { reference: product.reference },
    });

    const savedProduct = await prisma.product.upsert({
      where: { reference: product.reference },
      update: {
        name: product.name,
        details: product.details,
        cost: String(product.cost),
        salePrice: String(product.salePrice),
        visible: product.visible,
        imageUrl: product.image,
        productTypeId: productType.id,
        productClassId: productClass.id,
      },
      create: {
        id: product.id,
        name: product.name,
        reference: product.reference,
        details: product.details,
        cost: String(product.cost),
        salePrice: String(product.salePrice),
        stock: product.stock,
        visible: product.visible,
        imageUrl: product.image,
        productTypeId: productType.id,
        productClassId: productClass.id,
      },
    });

    if (!existingProduct && product.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          type: StockMovementType.ADJUSTMENT,
          quantity: product.stock,
          previousStock: 0,
          nextStock: product.stock,
          reason: "Inventario inicial",
          note: "Carga inicial de productos",
          productId: savedProduct.id,
          userId: admin.id,
        },
      });
    }
  }

  const [typeCount, classCount, productCount, movementCount] = await Promise.all([
    prisma.productType.count(),
    prisma.productClass.count(),
    prisma.product.count(),
    prisma.stockMovement.count(),
  ]);

  console.log("Seed completado");
  console.log(`Tipos: ${typeCount}`);
  console.log(`Clases: ${classCount}`);
  console.log(`Productos: ${productCount}`);
  console.log(`Movimientos: ${movementCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
