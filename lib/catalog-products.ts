export type CatalogAttributeDataType =
  | "TEXT"
  | "NUMBER"
  | "OPTION"
  | "BOOLEAN";

export type CatalogAttributeOption = {
  active: boolean;
  id: string;
  position: number;
  value: string;
};

export type CatalogAttributeDefinition = {
  active: boolean;
  dataType: CatalogAttributeDataType;
  id: string;
  key: string;
  name: string;
  options: CatalogAttributeOption[];
  position: number;
  required: boolean;
  unit: string;
};

export type CatalogProductType = {
  active: boolean;
  attributes: CatalogAttributeDefinition[];
  id: string;
  name: string;
};

export type CatalogCategory = {
  active: boolean;
  id: string;
  name: string;
  productTypes: CatalogProductType[];
};

export type CatalogVariantAttributeValue = {
  attributeId: string;
  attributeName: string;
  id: string;
  optionId: string;
  unit: string;
  value: string;
};

export type CatalogProductVariant = {
  active: boolean;
  attributeValues: CatalogVariantAttributeValue[];
  baseCost: number;
  cost: number;
  id: string;
  location: string;
  minimumStock: number;
  name: string;
  reference: string;
  salePrice: number;
  stock: number;
  taxRate: number;
};

export type CatalogProductRecord = {
  brand: string;
  categoryId: string;
  categoryName: string;
  details: string;
  featured: boolean;
  featuredOrder: number | null;
  id: string;
  imageUrl: string;
  model: string;
  name: string;
  productTypeId: string;
  productTypeName: string;
  variants: CatalogProductVariant[];
  visible: boolean;
};
