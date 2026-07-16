export type Product = {
  id: string;
  name: string;
  reference: string;
  category: string;
  productClass: string;
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
    category: "Electrodomésticos",
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
    name: "Lavadora automática",
    reference: "REF-LAV-016",
    category: "Electrodomésticos",
    productClass: "Lavadora",
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
    productClass: "Colchón",
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
    category: "Electrodomésticos",
    productClass: "Televisor",
    details: "Televisor Smart TV de 55 pulgadas con imagen 4K y conexión WiFi.",
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
    details: "Juego de sala para estar con sofá principal, poltrona y mesa auxiliar.",
    cost: 1900000,
    salePrice: 2750000,
    stock: 1,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "bafle-bluetooth",
    name: "Bafle Bluetooth portátil",
    reference: "AUD-018",
    category: "Audio y video",
    productClass: "Bafle",
    details: "Bafle recargable con conexión Bluetooth, puerto USB y micrófono.",
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
    details: "Sistema de sonido para sala con parlantes y conectividad inalámbrica.",
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
    category: "Electrodomésticos",
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
    details: "Poltrona cómoda para sala de estar con sistema reclinable.",
    cost: 520000,
    salePrice: 820000,
    stock: 4,
    visible: true,
    image:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=80",
  },
];
