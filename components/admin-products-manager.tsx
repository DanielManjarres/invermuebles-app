"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  X,
} from "lucide-react";
import {
  createProductId,
} from "@/lib/admin-products";
import { SelectMenu } from "@/components/select-menu";
import type { Product } from "@/lib/products";
import type { DatabaseProductType } from "@/lib/database-products";

type AdminProductsManagerProps = {
  productTypes: DatabaseProductType[];
  products: Product[];
};

type ProductFormState = {
  name: string;
  reference: string;
  category: string;
  productClass: string;
  details: string;
  cost: string;
  salePrice: string;
  stock: string;
  visible: boolean;
  image: string;
};

type ProductType = {
  name: string;
  classes: string[];
};

type TaxonomyDialog =
  | {
      mode: "renameType";
      typeName: string;
      value: string;
    }
  | {
      mode: "deleteType";
      typeName: string;
      value: string;
    }
  | {
      mode: "renameClass";
      typeName: string;
      className: string;
      value: string;
    }
  | {
      mode: "deleteClass";
      typeName: string;
      className: string;
      value: string;
    };

const fallbackImage =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80";
function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeName(value: string) {
  return cleanText(value).toLowerCase();
}

function cleanReference(value: string) {
  return cleanText(value).toUpperCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO");
}

function isValidImageSource(value: string) {
  const image = value.trim();

  if (!image) {
    return true;
  }

  if (image.startsWith("/") && !image.startsWith("//") && !/\s/.test(image)) {
    return true;
  }

  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildProductTypesFromProducts(products: Product[]): ProductType[] {
  const productTypes = new Map<string, ProductType>();

  products.forEach((product) => {
    const typeName = cleanText(product.category);
    const className = cleanText(product.productClass);

    if (!typeName) {
      return;
    }

    const currentType = productTypes.get(normalizeName(typeName)) ?? {
      name: typeName,
      classes: [],
    };

    if (
      className &&
      !currentType.classes.some(
        (productClass) => normalizeName(productClass) === normalizeName(className)
      )
    ) {
      currentType.classes.push(className);
    }

    productTypes.set(normalizeName(typeName), currentType);
  });

  return Array.from(productTypes.values());
}

function mergeProductTypes(baseTypes: ProductType[], storedTypes: ProductType[]) {
  const productTypes = new Map<string, ProductType>();

  [...baseTypes, ...storedTypes].forEach((productType) => {
    const typeName = cleanText(productType.name);

    if (!typeName) {
      return;
    }

    const currentType = productTypes.get(normalizeName(typeName)) ?? {
      name: typeName,
      classes: [],
    };

    productType.classes.forEach((productClass) => {
      const className = cleanText(productClass);

      if (
        className &&
        !currentType.classes.some(
          (currentClass) => normalizeName(currentClass) === normalizeName(className)
        )
      ) {
        currentType.classes.push(className);
      }
    });

    productTypes.set(normalizeName(typeName), currentType);
  });

  return Array.from(productTypes.values());
}

async function saveTaxonomyAction(body: Record<string, string>) {
  const response = await fetch("/api/product-taxonomy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(result.message ?? "No se pudo guardar el cambio.");
  }
}

function validateProductForm(
  form: ProductFormState,
  products: Product[],
  editingProductId: string | null
) {
  const requiredFields = [
    form.name,
    form.reference,
    form.category,
    form.productClass,
    form.details,
  ];

  if (requiredFields.some((field) => cleanText(field).length === 0)) {
    return "Completa los datos principales del producto.";
  }

  if (cleanText(form.category).toLowerCase() === "todos") {
    return "Usa un tipo de producto real, por ejemplo Muebles o Electrodomésticos.";
  }

  if ([form.cost, form.salePrice, form.stock].some((field) => cleanText(field) === "")) {
    return "Completa costo, precio de venta y stock.";
  }

  const cost = Number(form.cost);
  const salePrice = Number(form.salePrice);
  const stock = Number(form.stock);

  if (![cost, salePrice, stock].every(Number.isFinite)) {
    return "Costo, precio y stock deben ser números válidos.";
  }

  if (cost < 0 || salePrice < 0 || stock < 0) {
    return "Los valores y el stock no pueden ser negativos.";
  }

  if (!Number.isInteger(stock)) {
    return "El stock debe ser un número entero.";
  }

  if (salePrice < cost) {
    return "El precio de venta no debería ser menor que el costo.";
  }

  if (!isValidImageSource(form.image)) {
    return "La imagen debe ser una URL válida o una ruta interna como /productos/foto.jpg.";
  }

  const reference = cleanReference(form.reference);
  const duplicateReference = products.some(
    (product) =>
      cleanReference(product.reference) === reference &&
      product.id !== editingProductId
  );

  if (duplicateReference) {
    return "Ya existe un producto con esa referencia.";
  }

  return "";
}

function createEmptyForm(): ProductFormState {
  return {
    name: "",
    reference: "",
    category: "",
    productClass: "",
    details: "",
    cost: "",
    salePrice: "",
    stock: "",
    visible: false,
    image: "",
  };
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    reference: product.reference,
    category: product.category,
    productClass: product.productClass,
    details: product.details,
    cost: String(product.cost),
    salePrice: String(product.salePrice),
    stock: String(product.stock),
    visible: product.visible,
    image: product.image,
  };
}

function formToProduct(
  form: ProductFormState,
  existingProducts: Product[],
  currentId?: string
): Product {
  return {
    id: currentId ?? createProductId(cleanText(form.name), existingProducts),
    name: cleanText(form.name),
    reference: cleanReference(form.reference),
    category: cleanText(form.category),
    productClass: cleanText(form.productClass),
    details: cleanText(form.details),
    cost: Number(form.cost),
    salePrice: Number(form.salePrice),
    stock: Number(form.stock),
    visible: form.visible,
    image: form.image.trim() || fallbackImage,
  };
}

export function AdminProductsManager({
  productTypes: initialProductTypes,
  products,
}: AdminProductsManagerProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productTypes, setProductTypes] = useState<ProductType[]>(
    initialProductTypes
  );
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [newTypeName, setNewTypeName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(
    createEmptyForm()
  );
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [taxonomyDialog, setTaxonomyDialog] = useState<TaxonomyDialog | null>(
    null
  );
  const [taxonomyError, setTaxonomyError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [isTaxonomySaving, setIsTaxonomySaving] = useState(false);

  useEffect(() => {
    const storedProducts = products;
    const storedTypes = mergeProductTypes(
      buildProductTypesFromProducts(storedProducts),
      initialProductTypes
    );

    setProductList(storedProducts);
    setProductTypes(storedTypes);
    setSelectedTypeName("");
  }, [initialProductTypes, products]);

  const categories = useMemo(
    () => ["Todos", ...productTypes.map((productType) => productType.name)],
    [productTypes]
  );

  const productClasses = useMemo(() => {
    if (!productForm.category) {
      return [];
    }

    const selectedType = productTypes.find(
      (productType) =>
        normalizeName(productType.name) === normalizeName(productForm.category)
    );

    if (selectedType) {
      return selectedType.classes;
    }

    return Array.from(new Set(productList.map((product) => product.productClass)));
  }, [productForm.category, productList, productTypes]);

  const productTypesWithCounts = useMemo(
    () =>
      productTypes.map((productType) => ({
        ...productType,
        productCount: productList.filter(
          (product) =>
            normalizeName(product.category) === normalizeName(productType.name)
        ).length,
      })),
    [productList, productTypes]
  );

  const formCost = Number(productForm.cost);
  const formSalePrice = Number(productForm.salePrice);
  const hasValidPrices = Number.isFinite(formCost) && Number.isFinite(formSalePrice);
  const estimatedProfit = hasValidPrices ? formSalePrice - formCost : 0;
  const estimatedMargin =
    hasValidPrices && formSalePrice > 0
      ? Math.round((estimatedProfit / formSalePrice) * 100)
      : 0;
  const imagePreview =
    isValidImageSource(productForm.image) && productForm.image.trim()
      ? productForm.image.trim()
      : fallbackImage;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return productList.filter((product) => {
      const matchesCategory =
        activeCategory === "Todos" || product.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          product.name,
          product.reference,
          product.category,
          product.productClass,
          product.details,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, productList, query]);

  const visibleCatalogProducts = productList.filter(
    (product) => product.visible && product.stock > 0
  ).length;

  function persistProducts(nextProducts: Product[]) {
    setProductList(nextProducts);
  }

  function persistProductTypes(nextTypes: ProductType[]) {
    setProductTypes(nextTypes);
  }

  async function handleAddProductType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const typeName = cleanText(newTypeName);

    if (!typeName) {
      setNotice("Escribe el nombre del tipo que quieres agregar.");
      return;
    }

    const exists = productTypes.some(
      (productType) => normalizeName(productType.name) === normalizeName(typeName)
    );

    if (exists) {
      setNotice("Ese tipo ya esta registrado.");
      return;
    }

    setIsTaxonomySaving(true);
    try {
      await saveTaxonomyAction({ action: "createType", typeName });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "No se pudo agregar el tipo."
      );
      setIsTaxonomySaving(false);
      return;
    }
    setIsTaxonomySaving(false);

    const nextTypes = [...productTypes, { name: typeName, classes: [] }];
    persistProductTypes(nextTypes);
    setSelectedTypeName("");
    setNewTypeName("");
    setNotice(`${typeName} fue agregado como tipo de producto.`);
  }

  async function handleAddProductClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const typeName = cleanText(selectedTypeName);
    const className = cleanText(newClassName);

    if (!typeName || !className) {
      setNotice("Selecciona un tipo y escribe la clase que quieres agregar.");
      return;
    }

    const selectedType = productTypes.find(
      (productType) => normalizeName(productType.name) === normalizeName(typeName)
    );

    if (!selectedType) {
      setNotice("El tipo seleccionado no existe.");
      return;
    }

    const exists = selectedType.classes.some(
      (productClass) => normalizeName(productClass) === normalizeName(className)
    );

    if (exists) {
      setNotice("Esa clase ya esta registrada en ese tipo.");
      return;
    }

    setIsTaxonomySaving(true);
    try {
      await saveTaxonomyAction({
        action: "createClass",
        className,
        typeName: selectedType.name,
      });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "No se pudo agregar la clase."
      );
      setIsTaxonomySaving(false);
      return;
    }
    setIsTaxonomySaving(false);

    const nextTypes = productTypes.map((productType) =>
      normalizeName(productType.name) === normalizeName(typeName)
        ? {
            ...productType,
            classes: [...productType.classes, className],
          }
        : productType
    );

    persistProductTypes(nextTypes);
    setNewClassName("");
    setNotice(`${className} fue agregado a ${selectedType.name}.`);
  }

  function openRenameProductType(typeName: string) {
    setTaxonomyDialog({
      mode: "renameType",
      typeName,
      value: typeName,
    });
    setTaxonomyError("");
    setNotice("");
  }

  function openDeleteProductType(typeName: string, productCount: number) {
    if (productCount > 0) {
      setNotice("No puedes eliminar un tipo que tiene productos registrados.");
      return;
    }

    setTaxonomyDialog({
      mode: "deleteType",
      typeName,
      value: "",
    });
    setTaxonomyError("");
    setNotice("");
  }

  function openRenameProductClass(typeName: string, className: string) {
    setTaxonomyDialog({
      mode: "renameClass",
      typeName,
      className,
      value: className,
    });
    setTaxonomyError("");
    setNotice("");
  }

  function openDeleteProductClass(typeName: string, className: string) {
    const usedByProducts = productList.some(
      (product) =>
        normalizeName(product.category) === normalizeName(typeName) &&
        normalizeName(product.productClass) === normalizeName(className)
    );

    if (usedByProducts) {
      setNotice("No puedes eliminar una clase que tiene productos registrados.");
      return;
    }

    setTaxonomyDialog({
      mode: "deleteClass",
      typeName,
      className,
      value: "",
    });
    setTaxonomyError("");
    setNotice("");
  }

  function closeTaxonomyDialog() {
    setTaxonomyDialog(null);
    setTaxonomyError("");
  }

  async function handleTaxonomyDialogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taxonomyDialog) {
      return;
    }

    if (taxonomyDialog.mode === "renameType") {
      const currentName = cleanText(taxonomyDialog.typeName);
      const nextName = cleanText(taxonomyDialog.value);

      if (!nextName) {
        setTaxonomyError("Escribe el nuevo nombre del tipo.");
        return;
      }

      if (normalizeName(nextName) === normalizeName(currentName)) {
        closeTaxonomyDialog();
        return;
      }

      const exists = productTypes.some(
        (productType) =>
          normalizeName(productType.name) === normalizeName(nextName) &&
          normalizeName(productType.name) !== normalizeName(currentName)
      );

      if (exists) {
        setTaxonomyError("Ya existe un tipo con ese nombre.");
        return;
      }

      setIsTaxonomySaving(true);
      try {
        await saveTaxonomyAction({
          action: "renameType",
          nextTypeName: nextName,
          typeName: currentName,
        });
      } catch (error) {
        setTaxonomyError(
          error instanceof Error ? error.message : "No se pudo renombrar el tipo."
        );
        setIsTaxonomySaving(false);
        return;
      }
      setIsTaxonomySaving(false);

      const nextTypes = productTypes.map((productType) =>
        normalizeName(productType.name) === normalizeName(currentName)
          ? { ...productType, name: nextName }
          : productType
      );
      const nextProducts = productList.map((product) =>
        normalizeName(product.category) === normalizeName(currentName)
          ? { ...product, category: nextName }
          : product
      );

      persistProductTypes(nextTypes);
      persistProducts(nextProducts);
      setActiveCategory(
        normalizeName(activeCategory) === normalizeName(currentName)
          ? nextName
          : activeCategory
      );
      setSelectedTypeName(
        normalizeName(selectedTypeName) === normalizeName(currentName)
          ? nextName
          : selectedTypeName
      );
      setProductForm((currentForm) =>
        normalizeName(currentForm.category) === normalizeName(currentName)
          ? { ...currentForm, category: nextName }
          : currentForm
      );
      setNotice(`${currentName} fue renombrado como ${nextName}.`);
      closeTaxonomyDialog();
      return;
    }

    if (taxonomyDialog.mode === "deleteType") {
      setIsTaxonomySaving(true);
      try {
        await saveTaxonomyAction({
          action: "deleteType",
          typeName: taxonomyDialog.typeName,
        });
      } catch (error) {
        setTaxonomyError(
          error instanceof Error ? error.message : "No se pudo eliminar el tipo."
        );
        setIsTaxonomySaving(false);
        return;
      }
      setIsTaxonomySaving(false);

      const nextTypes = productTypes.filter(
        (productType) =>
          normalizeName(productType.name) !== normalizeName(taxonomyDialog.typeName)
      );

      persistProductTypes(nextTypes);
      setActiveCategory(
        normalizeName(activeCategory) === normalizeName(taxonomyDialog.typeName)
          ? "Todos"
          : activeCategory
      );
      setSelectedTypeName(
        normalizeName(selectedTypeName) === normalizeName(taxonomyDialog.typeName)
          ? ""
          : selectedTypeName
      );
      setProductForm((currentForm) =>
        normalizeName(currentForm.category) === normalizeName(taxonomyDialog.typeName)
          ? { ...currentForm, category: "", productClass: "" }
          : currentForm
      );
      setNotice(`${taxonomyDialog.typeName} fue eliminado.`);
      closeTaxonomyDialog();
      return;
    }

    if (taxonomyDialog.mode === "renameClass") {
      const currentClass = cleanText(taxonomyDialog.className);
      const nextClass = cleanText(taxonomyDialog.value);

      if (!nextClass) {
        setTaxonomyError("Escribe el nuevo nombre de la clase.");
        return;
      }

      if (normalizeName(nextClass) === normalizeName(currentClass)) {
        closeTaxonomyDialog();
        return;
      }

      const selectedType = productTypes.find(
        (productType) =>
          normalizeName(productType.name) === normalizeName(taxonomyDialog.typeName)
      );

      if (!selectedType) {
        setTaxonomyError("El tipo seleccionado no existe.");
        return;
      }

      const exists = selectedType.classes.some(
        (productClass) =>
          normalizeName(productClass) === normalizeName(nextClass) &&
          normalizeName(productClass) !== normalizeName(currentClass)
      );

      if (exists) {
        setTaxonomyError("Ya existe una clase con ese nombre en este tipo.");
        return;
      }

      setIsTaxonomySaving(true);
      try {
        await saveTaxonomyAction({
          action: "renameClass",
          className: currentClass,
          nextClassName: nextClass,
          typeName: taxonomyDialog.typeName,
        });
      } catch (error) {
        setTaxonomyError(
          error instanceof Error ? error.message : "No se pudo renombrar la clase."
        );
        setIsTaxonomySaving(false);
        return;
      }
      setIsTaxonomySaving(false);

      const nextTypes = productTypes.map((productType) =>
        normalizeName(productType.name) === normalizeName(taxonomyDialog.typeName)
          ? {
              ...productType,
              classes: productType.classes.map((productClass) =>
                normalizeName(productClass) === normalizeName(currentClass)
                  ? nextClass
                  : productClass
              ),
            }
          : productType
      );
      const nextProducts = productList.map((product) =>
        normalizeName(product.category) === normalizeName(taxonomyDialog.typeName) &&
        normalizeName(product.productClass) === normalizeName(currentClass)
          ? { ...product, productClass: nextClass }
          : product
      );

      persistProductTypes(nextTypes);
      persistProducts(nextProducts);
      setProductForm((currentForm) =>
        normalizeName(currentForm.category) ===
          normalizeName(taxonomyDialog.typeName) &&
        normalizeName(currentForm.productClass) === normalizeName(currentClass)
          ? { ...currentForm, productClass: nextClass }
          : currentForm
      );
      setNotice(`${currentClass} fue renombrada como ${nextClass}.`);
      closeTaxonomyDialog();
      return;
    }

    setIsTaxonomySaving(true);
    try {
      await saveTaxonomyAction({
        action: "deleteClass",
        className: taxonomyDialog.className,
        typeName: taxonomyDialog.typeName,
      });
    } catch (error) {
      setTaxonomyError(
        error instanceof Error ? error.message : "No se pudo eliminar la clase."
      );
      setIsTaxonomySaving(false);
      return;
    }
    setIsTaxonomySaving(false);

    const nextTypes = productTypes.map((productType) =>
      normalizeName(productType.name) === normalizeName(taxonomyDialog.typeName)
        ? {
            ...productType,
            classes: productType.classes.filter(
              (productClass) =>
                normalizeName(productClass) !==
                normalizeName(taxonomyDialog.className)
            ),
          }
        : productType
    );

    persistProductTypes(nextTypes);
    setProductForm((currentForm) =>
      normalizeName(currentForm.category) === normalizeName(taxonomyDialog.typeName) &&
      normalizeName(currentForm.productClass) ===
        normalizeName(taxonomyDialog.className)
        ? { ...currentForm, productClass: "" }
        : currentForm
    );
    setNotice(`${taxonomyDialog.className} fue eliminada de ${taxonomyDialog.typeName}.`);
    closeTaxonomyDialog();
  }

  function openCreateForm() {
    setEditingProductId(null);
    setProductForm(createEmptyForm());
    setIsProductFormOpen(true);
    setNotice("");
    setFormError("");
  }

  function openEditForm(product: Product) {
    setEditingProductId(product.id);
    setProductForm(productToForm(product));
    setIsProductFormOpen(true);
    setNotice("");
    setFormError("");
  }

  function closeProductForm() {
    setIsProductFormOpen(false);
    setEditingProductId(null);
    setProductForm(createEmptyForm());
    setFormError("");
  }

  async function toggleVisibility(product: Product) {
    const nextProducts = productList.map((item) =>
      item.id === product.id ? { ...item, visible: !product.visible } : item
    );

    persistProducts(nextProducts);
    try {
      const response = await fetch(`/api/products/${product.id}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visible: !product.visible }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        persistProducts(productList);
        setNotice(result.message ?? "No se pudo actualizar la visibilidad.");
        return;
      }
    } catch {
      persistProducts(productList);
      setNotice("No se pudo conectar con la base de datos.");
      return;
    }

    setNotice(
      product.visible
        ? `${product.name} quedó oculto del catálogo.`
        : `${product.name} quedó visible en el catálogo.`
    );
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateProductForm(
      productForm,
      productList,
      editingProductId
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const previousProduct = productList.find(
      (product) => product.id === editingProductId
    );
    const savedProduct = formToProduct(
      productForm,
      productList,
      editingProductId ?? undefined
    );
    const productToSave = editingProductId
      ? { ...savedProduct, stock: previousProduct?.stock ?? savedProduct.stock }
      : savedProduct;

    setIsProductSaving(true);
    const response = await fetch("/api/products", {
      method: editingProductId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productToSave),
    }).catch(() => null);
    setIsProductSaving(false);

    if (!response) {
      setFormError("No se pudo conectar con la base de datos.");
      return;
    }

    const result = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    if (!response.ok) {
      setFormError(result.message ?? "No se pudo guardar el producto.");
      return;
    }

    if (editingProductId) {
      persistProducts(
        productList.map((product) =>
          product.id === editingProductId ? productToSave : product
        )
      );
      setNotice(`${productToSave.name} fue actualizado.`);
    } else {
      persistProducts([productToSave, ...productList]);
      setActiveCategory(productToSave.category);
      setNotice(`${productToSave.name} fue agregado a productos.`);
    }

    closeProductForm();
  }

  const isDeleteTaxonomyDialog =
    taxonomyDialog?.mode === "deleteType" ||
    taxonomyDialog?.mode === "deleteClass";
  const taxonomyDialogTitle =
    taxonomyDialog?.mode === "renameType"
      ? "Editar tipo"
      : taxonomyDialog?.mode === "deleteType"
        ? "Eliminar tipo"
        : taxonomyDialog?.mode === "renameClass"
          ? "Editar clase"
          : "Eliminar clase";
  const taxonomyDialogDescription =
    taxonomyDialog?.mode === "renameType"
      ? "Cambia el nombre del tipo. Los productos relacionados se actualizaran tambien."
      : taxonomyDialog?.mode === "deleteType"
        ? `Se eliminara el tipo ${taxonomyDialog.typeName} y sus clases registradas.`
        : taxonomyDialog?.mode === "renameClass"
          ? `Cambia el nombre de la clase dentro de ${taxonomyDialog.typeName}.`
          : taxonomyDialog
            ? `Se eliminara la clase ${taxonomyDialog.className} de ${taxonomyDialog.typeName}.`
            : "";
  const taxonomyDialogLabel =
    taxonomyDialog?.mode === "renameType"
      ? "Nombre del tipo"
      : "Nombre de la clase";

  return (
    <>
      <section className="statsGrid">
        <div className="stat">
          <PackagePlus size={22} />
          <span>Total productos</span>
          <strong>{productList.length}</strong>
        </div>
        <div className="stat">
          <Eye size={22} />
          <span>Visibles en catálogo</span>
          <strong>{visibleCatalogProducts}</strong>
        </div>
        <div className="stat">
          <Shapes size={22} />
          <span>Tipos registrados</span>
          <strong>{Math.max(categories.length - 1, 0)}</strong>
        </div>
      </section>

      {notice ? (
        <p className="inventoryNotice taxonomyNotice" aria-live="polite">
          <span>{notice}</span>
        </p>
      ) : null}

      <section className="tableSection taxonomySection">
        <div className="sectionHeader inventoryHeader productsSectionHeader">
          <div>
            <p className="eyebrow">Organizacion del catalogo</p>
            <h2>Tipos y clases</h2>
          </div>
        </div>

        <div className="taxonomyForms">
          <form className="taxonomyForm" onSubmit={handleAddProductType}>
            <label>
              Nuevo tipo
              <input
                placeholder="Ej: Muebles"
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
              />
            </label>
            <button
              className="secondaryButton"
              type="submit"
              disabled={isTaxonomySaving}
            >
              <Plus size={17} />
              {isTaxonomySaving ? "Guardando..." : "Agregar tipo"}
            </button>
          </form>

          <form className="taxonomyForm" onSubmit={handleAddProductClass}>
            <label>
              Tipo
              <SelectMenu
                options={productTypes.map((productType) => ({
                  label: productType.name,
                  value: productType.name,
                }))}
                placeholder="Selecciona un tipo"
                value={selectedTypeName}
                onChange={setSelectedTypeName}
              />
            </label>
            <label>
              Nueva clase
              <input
                placeholder="Ej: Televisor"
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
              />
            </label>
            <button
              className="secondaryButton"
              type="submit"
              disabled={isTaxonomySaving}
            >
              <Plus size={17} />
              {isTaxonomySaving ? "Guardando..." : "Agregar clase"}
            </button>
          </form>
        </div>

        <div className="taxonomyGrid">
          {productTypesWithCounts.map((productType) => (
            <article className="taxonomyCard" key={productType.name}>
              <div>
                <div>
                  <strong>{productType.name}</strong>
                  <span>{productType.productCount} producto(s)</span>
                </div>
                <div className="taxonomyActions">
                  <button
                    type="button"
                    aria-label={`Editar tipo ${productType.name}`}
                    title="Editar tipo"
                    onClick={() => openRenameProductType(productType.name)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar tipo ${productType.name}`}
                    title="Eliminar tipo"
                    onClick={() =>
                      openDeleteProductType(
                        productType.name,
                        productType.productCount
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="taxonomyChips">
                {productType.classes.length > 0 ? (
                  productType.classes.map((productClass) => {
                    const classProductCount = productList.filter(
                      (product) =>
                        normalizeName(product.category) ===
                          normalizeName(productType.name) &&
                        normalizeName(product.productClass) ===
                          normalizeName(productClass)
                    ).length;

                    return (
                      <div className="taxonomyChip" key={productClass}>
                        <span>{productClass}</span>
                        <small>{classProductCount}</small>
                        <button
                          type="button"
                          aria-label={`Editar clase ${productClass}`}
                          title="Editar clase"
                          onClick={() =>
                            openRenameProductClass(
                              productType.name,
                              productClass
                            )
                          }
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar clase ${productClass}`}
                          title="Eliminar clase"
                          onClick={() =>
                            openDeleteProductClass(
                              productType.name,
                              productClass
                            )
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span>Sin clases registradas</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tableSection productsSection">
        <div className="sectionHeader inventoryHeader productsSectionHeader">
          <div>
            <p className="eyebrow">Catálogo interno</p>
            <h2>Productos registrados</h2>
          </div>
          <button
            className="primaryButton inventoryCreateButton"
            type="button"
            onClick={openCreateForm}
          >
            <PackagePlus size={18} />
            Nuevo producto
          </button>
        </div>

        <div className="inventoryToolbar productsToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por producto, referencia, tipo o clase"
              type="search"
              value={query}
            />
          </label>

          <div
            className="inventoryFilters productCategoryFilters"
            aria-label="Filtros de productos"
          >
            {categories.map((category) => (
              <button
                className={
                  activeCategory === category ? "filterButton active" : "filterButton"
                }
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="tableWrap">
          <table className="productAdminTable">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo / clase</th>
                <th>Referencia</th>
                <th>Valores</th>
                <th>Estado web</th>
                <th className="actionsHeader">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>
                    <strong>{product.category}</strong>
                    <span className="reference">{product.productClass}</span>
                  </td>
                  <td>{product.reference}</td>
                  <td>
                    <span className="valueStack">
                      <span>Costo: {formatCurrency(product.cost)}</span>
                      <span>Venta: {formatCurrency(product.salePrice)}</span>
                    </span>
                  </td>
                  <td>
                    <span className={product.visible ? "available" : "unavailable"}>
                      {product.visible ? "Publicado" : "Oculto"}
                    </span>
                  </td>
                  <td className="actionsCell productActionsCell">
                    <details className="rowActionMenu">
                      <summary>
                        Gestionar
                        <ChevronDown size={15} />
                      </summary>
                      <div className="rowActionMenuContent">
                        <button
                          className="rowActionMenuItem"
                          type="button"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil size={16} />
                          Editar producto
                        </button>
                        <button
                          className="rowActionMenuItem"
                          type="button"
                          onClick={() => toggleVisibility(product)}
                        >
                          {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                          {product.visible ? "Ocultar de la web" : "Publicar en la web"}
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isProductFormOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form className="adminModal" onSubmit={handleProductSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">
                  {editingProductId ? "Editar producto" : "Nuevo producto"}
                </p>
                <h2>{editingProductId ? productForm.name : "Registrar producto"}</h2>
              </div>
              <button
                className="modalClose"
                type="button"
                aria-label="Cerrar"
                onClick={closeProductForm}
              >
                <X size={20} />
              </button>
            </div>

            <div className="adminFormGrid">
              <div className="adminFormPreview adminFormWide">
                <div className="adminFormImagePreview">
                  <img src={imagePreview} alt="Vista previa del producto" />
                </div>
                <div>
                  <span className="previewLabel">Vista previa</span>
                  <strong>{productForm.name || "Nombre del producto"}</strong>
                  <span>{productForm.reference || "Referencia"}</span>
                  <p>
                    {productForm.image.trim()
                      ? "La imagen se usará en el catálogo web."
                      : "Si no agregas imagen, se usará una imagen temporal."}
                  </p>
                </div>
              </div>

              <label>
                Nombre
                <input
                  required
                  placeholder="Ej: Sala modular gris"
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({ ...productForm, name: event.target.value })
                  }
                />
              </label>
              <label>
                Referencia
                <input
                  required
                  placeholder="Ej: MUE-001"
                  value={productForm.reference}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      reference: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Tipo / categoría
                <SelectMenu
                  options={productTypes.map((productType) => ({
                    label: productType.name,
                    value: productType.name,
                  }))}
                  placeholder="Selecciona un tipo"
                  value={productForm.category}
                  onChange={(nextCategory) => {
                    const nextType = productTypes.find(
                      (productType) =>
                        normalizeName(productType.name) === normalizeName(nextCategory)
                    );
                    const shouldKeepClass = nextType?.classes.some(
                      (productClass) =>
                        normalizeName(productClass) ===
                        normalizeName(productForm.productClass)
                    );

                    setProductForm({
                      ...productForm,
                      category: nextCategory,
                      productClass: shouldKeepClass ? productForm.productClass : "",
                    });
                  }}
                />
              </label>
              <label>
                Clase
                <SelectMenu
                  disabled={!productForm.category}
                  options={productClasses.map((productClass) => ({
                    label: productClass,
                    value: productClass,
                  }))}
                  placeholder={
                    productForm.category
                      ? "Selecciona una clase"
                      : "Selecciona primero un tipo"
                  }
                  value={productForm.productClass}
                  onChange={(value) =>
                    setProductForm({
                      ...productForm,
                      productClass: value,
                    })
                  }
                />
                <span className="fieldHint">
                  Si no aparece la clase, agregala primero en Tipos y clases.
                </span>
              </label>
              <label>
                Costo
                <input
                  min="0"
                  required
                  step="1"
                  type="number"
                  value={productForm.cost}
                  onChange={(event) =>
                    setProductForm({ ...productForm, cost: event.target.value })
                  }
                />
              </label>
              <label>
                Precio venta
                <input
                  min="0"
                  required
                  step="1"
                  type="number"
                  value={productForm.salePrice}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      salePrice: event.target.value,
                    })
                  }
                />
              </label>
              {!editingProductId ? (
                <label>
                  Stock inicial
                  <input
                    min="0"
                    required
                    step="1"
                    type="number"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({ ...productForm, stock: event.target.value })
                    }
                  />
                </label>
              ) : (
                <p className="formHint adminFormWide">
                  El stock de este producto se actualiza desde Inventario,
                  registrando una entrada, salida o ajuste.
                </p>
              )}
              <div className="adminFormWide priceSummary">
                <div>
                  <span>Utilidad estimada</span>
                  <strong>
                    {hasValidPrices ? formatCurrency(Math.max(estimatedProfit, 0)) : "0"}
                  </strong>
                </div>
                <div>
                  <span>Margen aproximado</span>
                  <strong>{hasValidPrices ? `${Math.max(estimatedMargin, 0)}%` : "0%"}</strong>
                </div>
              </div>
              <label>
                Imagen
                <input
                  placeholder="https://... o /productos/foto.jpg"
                  value={productForm.image}
                  onChange={(event) =>
                    setProductForm({ ...productForm, image: event.target.value })
                  }
                />
                <span className="fieldHint">
                  Puede ser una URL externa o una ruta interna guardada en public.
                </span>
              </label>
              <label className="adminFormWide">
                Detalles
                <textarea
                  required
                  rows={3}
                  value={productForm.details}
                  onChange={(event) =>
                    setProductForm({ ...productForm, details: event.target.value })
                  }
                />
              </label>
              <label className="checkRow adminFormWide">
                <input
                  checked={productForm.visible}
                  type="checkbox"
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      visible: event.target.checked,
                    })
                  }
                />
                Mostrar en catálogo web
              </label>
            </div>

            {formError ? <p className="formError">{formError}</p> : null}

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeProductForm}
                disabled={isProductSaving}
              >
                Cancelar
              </button>
              <button
                className="primaryButton"
                type="submit"
                disabled={isProductSaving}
              >
                {isProductSaving ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {taxonomyDialog ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form
            className="adminModal smallModal taxonomyDialog"
            onSubmit={handleTaxonomyDialogSubmit}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Organizacion del catalogo</p>
                <h2>{taxonomyDialogTitle}</h2>
              </div>
              <button
                className="modalClose"
                type="button"
                aria-label="Cerrar"
                onClick={closeTaxonomyDialog}
              >
                <X size={20} />
              </button>
            </div>

            <p className="formHint">{taxonomyDialogDescription}</p>

            {isDeleteTaxonomyDialog ? (
              <div className="deleteSummary">
                <span>Elemento seleccionado</span>
                <strong>
                  {taxonomyDialog.mode === "deleteType"
                    ? taxonomyDialog.typeName
                    : taxonomyDialog.className}
                </strong>
              </div>
            ) : (
              <label className="adminFormSingle">
                {taxonomyDialogLabel}
                <input
                  autoFocus
                  value={taxonomyDialog.value}
                  onChange={(event) =>
                    setTaxonomyDialog({
                      ...taxonomyDialog,
                      value: event.target.value,
                    })
                  }
                />
              </label>
            )}

            {taxonomyError ? <p className="formError">{taxonomyError}</p> : null}

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeTaxonomyDialog}
                disabled={isTaxonomySaving}
              >
                Cancelar
              </button>
              <button
                className={isDeleteTaxonomyDialog ? "dangerButton" : "primaryButton"}
                type="submit"
                disabled={isTaxonomySaving}
              >
                {isTaxonomySaving
                  ? "Guardando..."
                  : isDeleteTaxonomyDialog
                    ? "Eliminar"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
