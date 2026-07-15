export type Product = {
  id: string;
  name: string;
  reference: string;
  category: "Muebles" | "Electrodomésticos" | "Colchones";
  details: string;
  cost: number;
  salePrice: number;
  stock: number;
  visible: boolean;
  image: string;
};

export const products: Product[] = [
  {
    id: "sala-modular-gris",
    name: "Sala modular gris",
    reference: "MUE-001",
    category: "Muebles",
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
    category: "Electrodomésticos",
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
    name: "Lavadora automática",
    reference: "REF-LAV-016",
    category: "Electrodomésticos",
    details: "Lavadora automática de carga superior para uso familiar.",
    cost: 1350000,
    salePrice: 1880000,
    stock: 0,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "colchon-doble",
    name: "Colchón doble",
    reference: "COL-120",
    category: "Colchones",
    details: "Colchón doble con soporte medio y tela acolchada.",
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
    details: "Centro de entretenimiento compacto con espacio de almacenamiento.",
    cost: 320000,
    salePrice: 520000,
    stock: 4,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1616627561839-074385245ff6?auto=format&fit=crop&w=900&q=80",
  },
];
