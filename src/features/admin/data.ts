export interface AdminStat {
  label: string;
  value: string;
  delta: number;
  trend: "up" | "down";
  caption: string;
}

export type Gateway = "eSewa" | "Khalti" | "COD";

export type OrderStatus =
  | "Pending"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export interface AdminOrder {
  id: string;
  customer: string;
  email: string;
  items: number;
  amount: number;
  gateway: Gateway;
  status: OrderStatus;
  date: string;
}

export interface AdminProduct {
  name: string;
  sku: string;
  category: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  image: string;
  status: "Published" | "Draft";
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  image: string;
  sold: number;
  revenue: number;
}

export const adminStats: AdminStat[] = [
  {
    label: "Total revenue",
    value: "Rs. 8,452,300",
    delta: 12.4,
    trend: "up",
    caption: "vs. last month",
  },
  {
    label: "Total orders",
    value: "1,284",
    delta: 8.1,
    trend: "up",
    caption: "vs. last month",
  },
  {
    label: "Customers",
    value: "940",
    delta: 4.3,
    trend: "up",
    caption: "vs. last month",
  },
  {
    label: "Avg. order value",
    value: "Rs. 6,582",
    delta: 1.2,
    trend: "down",
    caption: "vs. last month",
  },
];

export const revenueSeries: RevenuePoint[] = [
  { month: "Jan", revenue: 412_000, orders: 84 },
  { month: "Feb", revenue: 538_000, orders: 101 },
  { month: "Mar", revenue: 465_000, orders: 92 },
  { month: "Apr", revenue: 612_000, orders: 118 },
  { month: "May", revenue: 588_000, orders: 110 },
  { month: "Jun", revenue: 704_000, orders: 133 },
  { month: "Jul", revenue: 676_000, orders: 121 },
  { month: "Aug", revenue: 815_000, orders: 149 },
  { month: "Sep", revenue: 769_000, orders: 140 },
  { month: "Oct", revenue: 902_000, orders: 164 },
  { month: "Nov", revenue: 861_000, orders: 152 },
  { month: "Dec", revenue: 986_000, orders: 178 },
];

export const adminOrders: AdminOrder[] = [
  {
    id: "GA-8F3A2C1B",
    customer: "Aarav Shrestha",
    email: "aarav.shrestha@gmail.com",
    items: 2,
    amount: 189_900,
    gateway: "eSewa",
    status: "Paid",
    date: "18 Dec 2026",
  },
  {
    id: "GA-2E9B4D7A",
    customer: "Sneha Adhikari",
    email: "sneha.adhikari@gmail.com",
    items: 1,
    amount: 34_990,
    gateway: "Khalti",
    status: "Shipped",
    date: "18 Dec 2026",
  },
  {
    id: "GA-7C15A9E3",
    customer: "Bibek Karki",
    email: "bibek.karki@gmail.com",
    items: 3,
    amount: 142_900,
    gateway: "COD",
    status: "Delivered",
    date: "17 Dec 2026",
  },
  {
    id: "GA-5D08B6F2",
    customer: "Nisha Gurung",
    email: "nisha.gurung@gmail.com",
    items: 1,
    amount: 12_990,
    gateway: "eSewa",
    status: "Processing",
    date: "17 Dec 2026",
  },
  {
    id: "GA-9E27C1D4",
    customer: "Sagar Thapa",
    email: "sagar.thapa@gmail.com",
    items: 2,
    amount: 71_990,
    gateway: "Khalti",
    status: "Paid",
    date: "16 Dec 2026",
  },
  {
    id: "GA-3A94F8B5",
    customer: "Pooja Maharjan",
    email: "pooja.maharjan@gmail.com",
    items: 1,
    amount: 45_990,
    gateway: "COD",
    status: "Cancelled",
    date: "16 Dec 2026",
  },
  {
    id: "GA-6B12D7E9",
    customer: "Rajan Tamang",
    email: "rajan.tamang@gmail.com",
    items: 4,
    amount: 68_990,
    gateway: "eSewa",
    status: "Delivered",
    date: "15 Dec 2026",
  },
  {
    id: "GA-4C86A3F1",
    customer: "Anisha Rai",
    email: "anisha.rai@gmail.com",
    items: 1,
    amount: 189_900,
    gateway: "Khalti",
    status: "Pending",
    date: "15 Dec 2026",
  },
  {
    id: "GA-8D73E2B7",
    customer: "Kushal Bhandari",
    email: "kushal.bhandari@gmail.com",
    items: 2,
    amount: 55_990,
    gateway: "COD",
    status: "Pending",
    date: "14 Dec 2026",
  },
  {
    id: "GA-1E49C8D2",
    customer: "Ritika Joshi",
    email: "ritika.joshi@gmail.com",
    items: 1,
    amount: 27_999,
    gateway: "eSewa",
    status: "Shipped",
    date: "14 Dec 2026",
  },
  {
    id: "GA-5A21F7B9",
    customer: "Dipesh Khadka",
    email: "dipesh.khadka@gmail.com",
    items: 3,
    amount: 96_900,
    gateway: "Khalti",
    status: "Paid",
    date: "13 Dec 2026",
  },
  {
    id: "GA-2B58E4C3",
    customer: "Srijana Lama",
    email: "srijana.lama@gmail.com",
    items: 1,
    amount: 164_999,
    gateway: "COD",
    status: "Processing",
    date: "13 Dec 2026",
  },
];

export const adminProducts: AdminProduct[] = [
  {
    name: "Apple iPhone 15 Pro Max 256GB",
    sku: "APL-IP15P-256",
    category: "Phones",
    price: 189_900,
    originalPrice: 194_900,
    stock: 12,
    image: "/products/iphone-15-pro.jpg",
    status: "Published",
  },
  {
    name: "Samsung Galaxy S24 Ultra 12GB/256GB",
    sku: "SMG-S24U-256",
    category: "Phones",
    price: 164_999,
    originalPrice: 169_999,
    stock: 8,
    image: "/products/samsung-galaxy-s24.png",
    status: "Published",
  },
  {
    name: "Xiaomi Redmi Note 13 8GB/256GB",
    sku: "XMI-RN13-256",
    category: "Phones",
    price: 27_999,
    originalPrice: null,
    stock: 30,
    image: "/products/xiaomi-redmi-note-13.jpg",
    status: "Published",
  },
  {
    name: "Apple MacBook Air M2 8GB/256GB",
    sku: "APL-MBA-M2-256",
    category: "Laptops",
    price: 142_900,
    originalPrice: null,
    stock: 15,
    image: "/products/macbook-air-m2.jpg",
    status: "Published",
  },
  {
    name: "Dell XPS 13 Plus i7/16GB/512GB",
    sku: "DEL-XPS13-512",
    category: "Laptops",
    price: 154_999,
    originalPrice: 159_999,
    stock: 6,
    image: "/products/dell-xps-13.jpg",
    status: "Published",
  },
  {
    name: "HP Pavilion 15 i5/16GB/512GB",
    sku: "HPP-PAV15-512",
    category: "Laptops",
    price: 96_900,
    originalPrice: 102_900,
    stock: 4,
    image: "/products/hp-pavilion-15.jpg",
    status: "Draft",
  },
  {
    name: 'Samsung 55" 4K QLED Smart TV',
    sku: "SMG-TV55-QLED",
    category: "Televisions",
    price: 89_999,
    originalPrice: 94_999,
    stock: 10,
    image: "/products/samsung-55-inch-4k-qled-smart-tv.jpg",
    status: "Published",
  },
  {
    name: "LG 260L Double Door Refrigerator",
    sku: "LGR-FR260-DD",
    category: "Refrigerators",
    price: 71_990,
    originalPrice: null,
    stock: 18,
    image: "/products/lg-260l-double-door-refrigerator.jpg",
    status: "Published",
  },
  {
    name: "LG 7kg Front-Load Washing Machine",
    sku: "LGR-WM7-FL",
    category: "Home Appliances",
    price: 68_990,
    originalPrice: 72_990,
    stock: 9,
    image: "/products/lg-7kg-front-load-washing-machine.jpg",
    status: "Published",
  },
  {
    name: "Sony WH-1000XM5 Wireless Headphones",
    sku: "SNY-WH1000XM5",
    category: "Audio",
    price: 34_990,
    originalPrice: 37_990,
    stock: 20,
    image: "/products/sony-wh-1000xm5.jpg",
    status: "Published",
  },
  {
    name: "Apple AirPods Pro (2nd generation)",
    sku: "APL-APP2-USB",
    category: "Audio",
    price: 32_900,
    originalPrice: null,
    stock: 25,
    image: "/products/apple-airpods-pro.jpg",
    status: "Published",
  },
  {
    name: "JBL Flip 6 Bluetooth Speaker",
    sku: "JBL-FLIP6-BLK",
    category: "Audio",
    price: 12_990,
    originalPrice: 13_990,
    stock: 40,
    image: "/products/jbl-flip-6.jpg",
    status: "Published",
  },
  {
    name: "Voltas 1 Ton 3-Star Window AC",
    sku: "VLT-AC1-WIN",
    category: "Air Conditioners",
    price: 45_990,
    originalPrice: 48_990,
    stock: 7,
    image: "/products/voltas-1-ton-window-ac.jpg",
    status: "Published",
  },
  {
    name: 'Sony 50" 4K Ultra HD Smart TV',
    sku: "SNY-TV50-4K",
    category: "Televisions",
    price: 67_999,
    originalPrice: 72_999,
    stock: 3,
    image: "/products/sony-50-inch-4k-smart-tv.jpg",
    status: "Draft",
  },
];

export const topProducts: TopProduct[] = [
  {
    name: "Apple iPhone 15 Pro Max 256GB",
    image: "/products/iphone-15-pro.jpg",
    sold: 142,
    revenue: 26_960_000,
  },
  {
    name: "Samsung Galaxy S24 Ultra 12GB/256GB",
    image: "/products/samsung-galaxy-s24.png",
    sold: 118,
    revenue: 19_460_000,
  },
  {
    name: "Apple MacBook Air M2 8GB/256GB",
    image: "/products/macbook-air-m2.jpg",
    sold: 86,
    revenue: 12_290_000,
  },
  {
    name: 'Samsung 55" 4K QLED Smart TV',
    image: "/products/samsung-55-inch-4k-qled-smart-tv.jpg",
    sold: 74,
    revenue: 6_660_000,
  },
  {
    name: "Sony WH-1000XM5 Wireless Headphones",
    image: "/products/sony-wh-1000xm5.jpg",
    sold: 203,
    revenue: 7_100_000,
  },
];

export const productCategories = [
  "Phones",
  "Laptops",
  "Televisions",
  "Refrigerators",
  "Home Appliances",
  "Audio",
  "Air Conditioners",
];

export const productStatuses = ["Published", "Draft"] as const;

export const orderStatuses = [
  "Pending",
  "Paid",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

export const gateways: Gateway[] = ["eSewa", "Khalti", "COD"];
