import type {
  CatalogCategory,
  CatalogProductRecord,
} from "@/lib/catalog-products";
import { prisma } from "@/lib/prisma";

export async function getCatalogProductConfiguration(): Promise<
  CatalogCategory[]
> {
  const categories = await prisma.category.findMany({
    include: {
      productTypes: {
        include: {
          attributes: {
            include: {
              options: { orderBy: [{ position: "asc" }, { value: "asc" }] },
            },
            orderBy: [{ position: "asc" }, { name: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories.map((category) => ({
    active: category.active,
    id: category.id,
    name: category.name,
    productTypes: category.productTypes.map((productType) => ({
      active: productType.active,
      attributes: productType.attributes.map((attribute) => ({
        active: attribute.active,
        dataType: attribute.dataType,
        id: attribute.id,
        key: attribute.key,
        name: attribute.name,
        options: attribute.options.map((option) => ({
          active: option.active,
          id: option.id,
          position: option.position,
          value: option.value,
        })),
        position: attribute.position,
        required: attribute.required,
        unit: attribute.unit ?? "",
      })),
      id: productType.id,
      name: productType.name,
    })),
  }));
}

export async function getCatalogProducts(): Promise<CatalogProductRecord[]> {
  const products = await prisma.product.findMany({
    include: {
      catalogProductType: { include: { category: true } },
      images: {
        where: { isPrimary: true },
        orderBy: { position: "asc" },
        take: 1,
      },
      attributeValues: {
        include: { attribute: true },
        orderBy: { attribute: { position: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((product) => ({
    attributeValues: product.attributeValues.map((attributeValue) => ({
      attributeId: attributeValue.attributeId,
      attributeName: attributeValue.attribute.name,
      id: attributeValue.id,
      optionId: attributeValue.optionId ?? "",
      unit: attributeValue.attribute.unit ?? "",
      value: attributeValue.value,
    })),
    baseCost: Number(product.baseCost),
    cost: Number(product.cost),
    brand: product.brand ?? "",
    categoryId: product.catalogProductType.category.id,
    categoryName: product.catalogProductType.category.name,
    details: product.details,
    featured: product.featured,
    featuredOrder: product.featuredOrder,
    id: product.id,
    imageUrl: product.images[0]?.url ?? product.imageUrl ?? "",
    location: product.location ?? "",
    minimumStock: product.minimumStock,
    model: product.model ?? "",
    name: product.name,
    productTypeId: product.catalogProductType.id,
    productTypeName: product.catalogProductType.name,
    reference: product.reference,
    salePrice: Number(product.salePrice),
    stock: product.stock,
    taxRate: Number(product.taxRate),
    visible: product.visible,
  }));
}
