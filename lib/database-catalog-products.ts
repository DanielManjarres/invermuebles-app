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
      productClass: true,
      productType: true,
      variants: {
        include: {
          attributeValues: {
            include: { attribute: true },
            orderBy: { attribute: { position: "asc" } },
          },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((product) => ({
        brand: product.brand ?? "",
        categoryId: product.catalogProductType?.category.id ?? "",
        categoryName:
          product.catalogProductType?.category.name ?? product.productType.name,
        details: product.details,
        id: product.id,
        imageUrl: product.images[0]?.url ?? product.imageUrl ?? "",
        model: product.model ?? "",
        name: product.name,
        productTypeId: product.catalogProductType?.id ?? "",
        productTypeName:
          product.catalogProductType?.name ?? product.productClass.name,
        variants: product.variants.map((variant) => ({
          active: variant.active,
          attributeValues: variant.attributeValues.map((attributeValue) => ({
            attributeId: attributeValue.attributeId,
            attributeName: attributeValue.attribute.name,
            id: attributeValue.id,
            optionId: attributeValue.optionId ?? "",
            unit: attributeValue.attribute.unit ?? "",
            value: attributeValue.value,
          })),
          cost: Number(variant.cost),
          id: variant.id,
          isDefault: variant.isDefault,
          location: variant.location ?? "",
          minimumStock: variant.minimumStock,
          name: variant.name,
          reference: variant.reference,
          salePrice: Number(variant.salePrice),
          stock: variant.stock,
        })),
        visible: product.visible,
      }));
}
