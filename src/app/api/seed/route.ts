/** biome-ignore-all lint/performance/noAwaitInLoops: Just a route */
import { db } from "@/lib/prisma";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: not too complex
export async function GET() {
  const categories = [
    {
      name: "Smartphones",
      slug: "smartphones",
      description: "Smartphones, flagship phones, and budget devices.",
    },
    {
      name: "Laptops",
      slug: "laptops",
      description: "Laptops for work, study, gaming, and creative workloads.",
    },
    {
      name: "Tablets",
      slug: "tablets",
      description: "Tablets for entertainment, productivity, and creativity.",
    },
    {
      name: "Headphones & Earbuds",
      slug: "headphones-earbuds",
      description: "Wireless earbuds, headphones, and audio accessories.",
    },
    {
      name: "Smartwatches",
      slug: "smartwatches",
      description: "Smartwatches and wearable technology.",
    },
    {
      name: "Cameras",
      slug: "cameras",
      description:
        "Digital cameras, action cameras, and photography equipment.",
    },
    {
      name: "Gaming",
      slug: "gaming",
      description:
        "Gaming consoles, controllers, keyboards, mice, and accessories.",
    },
    {
      name: "Monitors",
      slug: "monitors",
      description: "Computer monitors for work, gaming, and content creation.",
    },
    {
      name: "Computer Accessories",
      slug: "computer-accessories",
      description: "Keyboards, mice, webcams, hubs, and other accessories.",
    },
    {
      name: "Networking",
      slug: "networking",
      description:
        "Routers, Wi-Fi systems, switches, and networking equipment.",
    },
    {
      name: "Storage",
      slug: "storage",
      description: "SSDs, hard drives, memory cards, and USB storage.",
    },
    {
      name: "Smart Home",
      slug: "smart-home",
      description: "Smart speakers, lights, cameras, plugs, and home devices.",
    },
  ];

  interface Variant {
    sku: string;
    price: string;
    stock: number;
    options?: Record<string, string>;
  }

  interface ProductSeed {
    name: string;
    slug: string;
    category: string;
    description: string;
    baseImage?: string;
    published?: boolean;
    archived?: boolean;
    variants: Variant[];
  }

  const products: ProductSeed[] = [
    // ============================================================
    // SMARTPHONES
    // ============================================================

    {
      name: "Apple iPhone 17 Pro",
      slug: "apple-iphone-17-pro",
      baseImage: "https://picsum.photos/seed/apple-iphone-17-pro/400/400",
      category: "smartphones",
      description:
        "Premium Apple smartphone with a Pro camera system, high-performance processor, and advanced display.",
      variants: [
        {
          sku: "IPH17PRO-256-BLK",
          price: "134999",
          stock: 18,
          options: { Storage: "256GB", Color: "Black" },
        },
        {
          sku: "IPH17PRO-256-SLV",
          price: "134999",
          stock: 12,
          options: { Storage: "256GB", Color: "Silver" },
        },
        {
          sku: "IPH17PRO-512-BLK",
          price: "154999",
          stock: 9,
          options: { Storage: "512GB", Color: "Black" },
        },
      ],
    },

    {
      name: "Apple iPhone 17",
      slug: "apple-iphone-17",
      baseImage: "https://picsum.photos/seed/apple-iphone-17/400/400",
      category: "smartphones",
      description:
        "Modern iPhone combining powerful performance, excellent cameras, and long battery life.",
      variants: [
        {
          sku: "IPH17-128-BLK",
          price: "104999",
          stock: 24,
          options: { Storage: "128GB", Color: "Black" },
        },
        {
          sku: "IPH17-256-BLU",
          price: "114999",
          stock: 15,
          options: { Storage: "256GB", Color: "Blue" },
        },
      ],
    },

    {
      name: "Samsung Galaxy S26 Ultra",
      slug: "samsung-galaxy-s26-ultra",
      baseImage: "https://picsum.photos/seed/samsung-galaxy-s26-ultra/400/400",
      category: "smartphones",
      description:
        "Flagship Samsung smartphone featuring an advanced camera system, large AMOLED display, and S Pen.",
      variants: [
        {
          sku: "S26U-256-BLK",
          price: "159999",
          stock: 14,
          options: { Storage: "256GB", Color: "Black" },
        },
        {
          sku: "S26U-512-GRY",
          price: "179999",
          stock: 8,
          options: { Storage: "512GB", Color: "Gray" },
        },
      ],
    },

    {
      name: "Samsung Galaxy S26",
      slug: "samsung-galaxy-s26",
      baseImage: "https://picsum.photos/seed/samsung-galaxy-s26/400/400",
      category: "smartphones",
      description:
        "Compact flagship smartphone with a high refresh rate AMOLED display and powerful performance.",
      variants: [
        {
          sku: "S26-256-BLK",
          price: "119999",
          stock: 20,
          options: { Storage: "256GB", Color: "Black" },
        },
        {
          sku: "S26-256-WHT",
          price: "119999",
          stock: 13,
          options: { Storage: "256GB", Color: "White" },
        },
      ],
    },

    {
      name: "Google Pixel 10 Pro",
      slug: "google-pixel-10-pro",
      baseImage: "https://picsum.photos/seed/google-pixel-10-pro/400/400",
      category: "smartphones",
      description:
        "Google flagship phone with advanced computational photography and clean Android software.",
      variants: [
        {
          sku: "PX10P-256-BLK",
          price: "119999",
          stock: 11,
          options: { Storage: "256GB", Color: "Obsidian" },
        },
        {
          sku: "PX10P-512-WHT",
          price: "139999",
          stock: 6,
          options: { Storage: "512GB", Color: "Porcelain" },
        },
      ],
    },

    // ============================================================
    // LAPTOPS
    // ============================================================

    {
      name: "Apple MacBook Air M4",
      slug: "apple-macbook-air-m4",
      baseImage: "https://picsum.photos/seed/apple-macbook-air-m4/400/400",
      category: "laptops",
      description:
        "Thin and lightweight MacBook Air powered by Apple's M4 chip.",
      variants: [
        {
          sku: "MBA-M4-13-256-SLV",
          price: "139999",
          stock: 10,
          options: { Size: '13"', Storage: "256GB", Color: "Silver" },
        },
        {
          sku: "MBA-M4-13-512-MID",
          price: "159999",
          stock: 7,
          options: { Size: '13"', Storage: "512GB", Color: "Midnight" },
        },
      ],
    },

    {
      name: "Apple MacBook Pro M4 Pro",
      slug: "apple-macbook-pro-m4-pro",
      baseImage: "https://picsum.photos/seed/apple-macbook-pro-m4-pro/400/400",
      category: "laptops",
      description:
        "Professional MacBook with M4 Pro performance and a high-resolution Liquid Retina XDR display.",
      variants: [
        {
          sku: "MBP-M4P-14-512-SLV",
          price: "229999",
          stock: 5,
          options: { Size: '14"', Storage: "512GB", RAM: "24GB" },
        },
        {
          sku: "MBP-M4P-14-1TB-BLK",
          price: "269999",
          stock: 4,
          options: { Size: '14"', Storage: "1TB", RAM: "48GB" },
        },
      ],
    },

    {
      name: "Dell XPS 14",
      slug: "dell-xps-14",
      baseImage: "https://picsum.photos/seed/dell-xps-14/400/400",
      category: "laptops",
      description:
        "Premium Windows laptop designed for productivity and creative workloads.",
      variants: [
        {
          sku: "XPS14-I7-512",
          price: "189999",
          stock: 8,
          options: { Storage: "512GB", RAM: "16GB" },
        },
        {
          sku: "XPS14-I7-1TB",
          price: "209999",
          stock: 5,
          options: { Storage: "1TB", RAM: "32GB" },
        },
      ],
    },

    {
      name: "ASUS ROG Zephyrus G16",
      slug: "asus-rog-zephyrus-g16",
      baseImage: "https://picsum.photos/seed/asus-rog-zephyrus-g16/400/400",
      category: "laptops",
      description:
        "High-performance gaming laptop with a powerful GPU and high-refresh-rate display.",
      variants: [
        {
          sku: "ROGG16-16-512",
          price: "219999",
          stock: 6,
          options: { Storage: "512GB", RAM: "16GB" },
        },
        {
          sku: "ROGG16-16-1TB",
          price: "249999",
          stock: 4,
          options: { Storage: "1TB", RAM: "32GB" },
        },
      ],
    },

    {
      name: "Lenovo ThinkPad X1 Carbon",
      slug: "lenovo-thinkpad-x1-carbon",
      baseImage: "https://picsum.photos/seed/lenovo-thinkpad-x1-carbon/400/400",
      category: "laptops",
      description:
        "Business-focused ultrabook with a lightweight chassis and excellent keyboard.",
      variants: [
        {
          sku: "X1C-I7-512",
          price: "169999",
          stock: 9,
          options: { Storage: "512GB", RAM: "16GB" },
        },
        {
          sku: "X1C-I7-1TB",
          price: "189999",
          stock: 5,
          options: { Storage: "1TB", RAM: "32GB" },
        },
      ],
    },

    // ============================================================
    // TABLETS
    // ============================================================

    {
      name: "Apple iPad Pro M4",
      slug: "apple-ipad-pro-m4",
      baseImage: "https://picsum.photos/seed/apple-ipad-pro-m4/400/400",
      category: "tablets",
      description:
        "High-end iPad with an OLED display and M4 performance for professional workloads.",
      variants: [
        {
          sku: "IPADPRO-M4-256",
          price: "149999",
          stock: 8,
          options: { Storage: "256GB", Size: '11"' },
        },
        {
          sku: "IPADPRO-M4-512",
          price: "169999",
          stock: 5,
          options: { Storage: "512GB", Size: '11"' },
        },
      ],
    },

    {
      name: "Apple iPad Air M3",
      slug: "apple-ipad-air-m3",
      baseImage: "https://picsum.photos/seed/apple-ipad-air-m3/400/400",
      category: "tablets",
      description: "Versatile iPad Air powered by Apple's M3 chip.",
      variants: [
        {
          sku: "IPADAIR-M3-128",
          price: "89999",
          stock: 16,
          options: { Storage: "128GB", Color: "Blue" },
        },
        {
          sku: "IPADAIR-M3-256",
          price: "99999",
          stock: 11,
          options: { Storage: "256GB", Color: "Gray" },
        },
      ],
    },

    {
      name: "Samsung Galaxy Tab S10 Ultra",
      slug: "samsung-galaxy-tab-s10-ultra",
      baseImage:
        "https://picsum.photos/seed/samsung-galaxy-tab-s10-ultra/400/400",
      category: "tablets",
      description:
        "Large premium Android tablet with an AMOLED display and productivity features.",
      variants: [
        {
          sku: "TABS10U-256-GRY",
          price: "119999",
          stock: 7,
          options: { Storage: "256GB", Color: "Gray" },
        },
        {
          sku: "TABS10U-512-BLK",
          price: "139999",
          stock: 5,
          options: { Storage: "512GB", Color: "Black" },
        },
      ],
    },

    {
      name: "Samsung Galaxy Tab S10",
      slug: "samsung-galaxy-tab-s10",
      baseImage: "https://picsum.photos/seed/samsung-galaxy-tab-s10/400/400",
      category: "tablets",
      description:
        "Premium Android tablet suitable for entertainment and productivity.",
      variants: [
        {
          sku: "TABS10-128-GRY",
          price: "74999",
          stock: 12,
          options: { Storage: "128GB", Color: "Gray" },
        },
        {
          sku: "TABS10-256-SLV",
          price: "84999",
          stock: 9,
          options: { Storage: "256GB", Color: "Silver" },
        },
      ],
    },

    {
      name: "Xiaomi Pad 7",
      slug: "xiaomi-pad-7",
      baseImage: "https://picsum.photos/seed/xiaomi-pad-7/400/400",
      category: "tablets",
      description:
        "Affordable high-performance Android tablet with a smooth high-resolution display.",
      variants: [
        {
          sku: "PAD7-128-BLU",
          price: "49999",
          stock: 18,
          options: { Storage: "128GB", Color: "Blue" },
        },
        {
          sku: "PAD7-256-BLK",
          price: "57999",
          stock: 14,
          options: { Storage: "256GB", Color: "Black" },
        },
      ],
    },

    // ============================================================
    // HEADPHONES & EARBUDS
    // ============================================================

    {
      name: "Apple AirPods Pro 3",
      slug: "apple-airpods-pro-3",
      baseImage: "https://picsum.photos/seed/apple-airpods-pro-3/400/400",
      category: "headphones-earbuds",
      description:
        "Premium wireless earbuds with active noise cancellation and spatial audio.",
      variants: [
        {
          sku: "APP3-WHT",
          price: "34999",
          stock: 30,
          options: { Color: "White" },
        },
      ],
    },

    {
      name: "Sony WH-1000XM6",
      slug: "sony-wh-1000xm6",
      baseImage: "https://picsum.photos/seed/sony-wh-1000xm6/400/400",
      category: "headphones-earbuds",
      description:
        "Premium over-ear headphones with industry-leading noise cancellation.",
      variants: [
        {
          sku: "SONYXM6-BLK",
          price: "54999",
          stock: 14,
          options: { Color: "Black" },
        },
        {
          sku: "SONYXM6-SLV",
          price: "54999",
          stock: 9,
          options: { Color: "Silver" },
        },
      ],
    },

    {
      name: "Samsung Galaxy Buds 4 Pro",
      slug: "samsung-galaxy-buds-4-pro",
      baseImage: "https://picsum.photos/seed/samsung-galaxy-buds-4-pro/400/400",
      category: "headphones-earbuds",
      description:
        "Premium Samsung wireless earbuds with noise cancellation and high-quality audio.",
      variants: [
        {
          sku: "BUDS4P-BLK",
          price: "24999",
          stock: 22,
          options: { Color: "Black" },
        },
        {
          sku: "BUDS4P-WHT",
          price: "24999",
          stock: 18,
          options: { Color: "White" },
        },
      ],
    },

    {
      name: "Sony WF-1000XM6",
      slug: "sony-wf-1000xm6",
      baseImage: "https://picsum.photos/seed/sony-wf-1000xm6/400/400",
      category: "headphones-earbuds",
      description:
        "Compact flagship wireless earbuds with advanced noise cancellation.",
      variants: [
        {
          sku: "SONYWF6-BLK",
          price: "39999",
          stock: 16,
          options: { Color: "Black" },
        },
      ],
    },

    {
      name: "JBL Tune 770NC",
      slug: "jbl-tune-770nc",
      baseImage: "https://picsum.photos/seed/jbl-tune-770nc/400/400",
      category: "headphones-earbuds",
      description:
        "Affordable wireless headphones with active noise cancellation and long battery life.",
      variants: [
        {
          sku: "JBL770-BLK",
          price: "12999",
          stock: 28,
          options: { Color: "Black" },
        },
        {
          sku: "JBL770-BLU",
          price: "12999",
          stock: 15,
          options: { Color: "Blue" },
        },
      ],
    },

    // ============================================================
    // SMARTWATCHES
    // ============================================================

    {
      name: "Apple Watch Series 11",
      slug: "apple-watch-series-11",
      baseImage: "https://picsum.photos/seed/apple-watch-series-11/400/400",
      category: "smartwatches",
      description:
        "Advanced Apple Watch with health tracking, fitness features, and smart notifications.",
      variants: [
        {
          sku: "AWS11-42-BLK",
          price: "49999",
          stock: 13,
          options: { Size: "42mm", Color: "Black" },
        },
        {
          sku: "AWS11-46-SLV",
          price: "54999",
          stock: 8,
          options: { Size: "46mm", Color: "Silver" },
        },
      ],
    },

    {
      name: "Apple Watch Ultra 3",
      slug: "apple-watch-ultra-3",
      baseImage: "https://picsum.photos/seed/apple-watch-ultra-3/400/400",
      category: "smartwatches",
      description:
        "Rugged Apple Watch designed for outdoor activities, fitness, and demanding use.",
      variants: [
        {
          sku: "AWU3-TIT",
          price: "99999",
          stock: 6,
          options: { Color: "Titanium" },
        },
      ],
    },

    {
      name: "Samsung Galaxy Watch 8",
      slug: "samsung-galaxy-watch-8",
      baseImage: "https://picsum.photos/seed/samsung-galaxy-watch-8/400/400",
      category: "smartwatches",
      description:
        "Premium Android smartwatch with health, fitness, and smart-device features.",
      variants: [
        {
          sku: "GW8-44-BLK",
          price: "39999",
          stock: 12,
          options: { Size: "44mm", Color: "Black" },
        },
        {
          sku: "GW8-40-SLV",
          price: "36999",
          stock: 9,
          options: { Size: "40mm", Color: "Silver" },
        },
      ],
    },

    {
      name: "Google Pixel Watch 4",
      slug: "google-pixel-watch-4",
      baseImage: "https://picsum.photos/seed/google-pixel-watch-4/400/400",
      category: "smartwatches",
      description:
        "Google smartwatch with health tracking and deep Android integration.",
      variants: [
        {
          sku: "PW4-41-BLK",
          price: "42999",
          stock: 10,
          options: { Size: "41mm", Color: "Black" },
        },
      ],
    },

    {
      name: "Garmin Venu 4",
      slug: "garmin-venu-4",
      baseImage: "https://picsum.photos/seed/garmin-venu-4/400/400",
      category: "smartwatches",
      description:
        "Fitness-focused smartwatch with advanced health and workout tracking.",
      variants: [
        {
          sku: "VENU4-BLK",
          price: "54999",
          stock: 7,
          options: { Color: "Black" },
        },
      ],
    },

    // ============================================================
    // CAMERAS
    // ============================================================

    {
      name: "Sony Alpha A7 IV",
      slug: "sony-alpha-a7-iv",
      baseImage: "https://picsum.photos/seed/sony-alpha-a7-iv/400/400",
      category: "cameras",
      description:
        "Full-frame mirrorless camera designed for photography and video production.",
      variants: [
        {
          sku: "SONYA7IV-BODY",
          price: "249999",
          stock: 5,
          options: { Configuration: "Body Only" },
        },
        {
          sku: "SONYA7IV-2870",
          price: "289999",
          stock: 3,
          options: { Configuration: "28-70mm Kit" },
        },
      ],
    },

    {
      name: "Canon EOS R6 Mark II",
      slug: "canon-eos-r6-mark-ii",
      baseImage: "https://picsum.photos/seed/canon-eos-r6-mark-ii/400/400",
      category: "cameras",
      description:
        "Full-frame mirrorless camera offering fast autofocus and strong video performance.",
      variants: [
        {
          sku: "CANONR6II-BODY",
          price: "259999",
          stock: 4,
          options: { Configuration: "Body Only" },
        },
      ],
    },

    {
      name: "Fujifilm X-T5",
      slug: "fujifilm-x-t5",
      baseImage: "https://picsum.photos/seed/fujifilm-x-t5/400/400",
      category: "cameras",
      description:
        "High-resolution APS-C mirrorless camera with classic Fujifilm controls.",
      variants: [
        {
          sku: "FXT5-BODY",
          price: "199999",
          stock: 5,
          options: { Configuration: "Body Only" },
        },
        {
          sku: "FXT5-1855",
          price: "229999",
          stock: 3,
          options: { Configuration: "18-55mm Kit" },
        },
      ],
    },

    {
      name: "GoPro HERO 14 Black",
      slug: "gopro-hero-14-black",
      baseImage: "https://picsum.photos/seed/gopro-hero-14-black/400/400",
      category: "cameras",
      description:
        "Rugged action camera designed for high-resolution adventure footage.",
      variants: [
        {
          sku: "GP14-BLK",
          price: "54999",
          stock: 14,
          options: { Configuration: "Standard" },
        },
      ],
    },

    {
      name: "DJI Osmo Pocket 4",
      slug: "dji-osmo-pocket-4",
      baseImage: "https://picsum.photos/seed/dji-osmo-pocket-4/400/400",
      category: "cameras",
      description:
        "Compact handheld camera with a stabilized gimbal and advanced video features.",
      variants: [
        {
          sku: "DJIP4-STD",
          price: "69999",
          stock: 9,
          options: { Configuration: "Standard" },
        },
        {
          sku: "DJIP4-CREATOR",
          price: "89999",
          stock: 5,
          options: { Configuration: "Creator Combo" },
        },
      ],
    },

    // ============================================================
    // GAMING
    // ============================================================

    {
      name: "Sony PlayStation 5 Slim",
      slug: "sony-playstation-5-slim",
      baseImage: "https://picsum.photos/seed/sony-playstation-5-slim/400/400",
      category: "gaming",
      description:
        "Compact PlayStation 5 gaming console with high-speed SSD storage.",
      variants: [
        {
          sku: "PS5SLIM-DIGITAL",
          price: "74999",
          stock: 12,
          options: { Edition: "Digital" },
        },
        {
          sku: "PS5SLIM-DISC",
          price: "84999",
          stock: 9,
          options: { Edition: "Disc" },
        },
      ],
    },

    {
      name: "Microsoft Xbox Series X",
      slug: "microsoft-xbox-series-x",
      baseImage: "https://picsum.photos/seed/microsoft-xbox-series-x/400/400",
      category: "gaming",
      description: "High-performance Xbox console designed for 4K gaming.",
      variants: [
        {
          sku: "XBOX-X-1TB",
          price: "79999",
          stock: 8,
          options: { Storage: "1TB" },
        },
      ],
    },

    {
      name: "Nintendo Switch 2",
      slug: "nintendo-switch-2",
      baseImage: "https://picsum.photos/seed/nintendo-switch-2/400/400",
      category: "gaming",
      description:
        "Hybrid gaming console that works as both a handheld and home console.",
      variants: [
        {
          sku: "SW2-BLK",
          price: "69999",
          stock: 15,
          options: { Color: "Black" },
        },
      ],
    },

    {
      name: "Sony DualSense Wireless Controller",
      slug: "sony-dualsense-wireless-controller",
      baseImage:
        "https://picsum.photos/seed/sony-dualsense-wireless-controller/400/400",
      category: "gaming",
      description:
        "Wireless PlayStation controller with adaptive triggers and haptic feedback.",
      variants: [
        {
          sku: "DUALSENSE-WHT",
          price: "10999",
          stock: 30,
          options: { Color: "White" },
        },
        {
          sku: "DUALSENSE-BLK",
          price: "11999",
          stock: 24,
          options: { Color: "Black" },
        },
      ],
    },

    {
      name: "Logitech G Pro X Superlight 2",
      slug: "logitech-g-pro-x-superlight-2",
      baseImage:
        "https://picsum.photos/seed/logitech-g-pro-x-superlight-2/400/400",
      category: "gaming",
      description: "Lightweight high-performance wireless gaming mouse.",
      variants: [
        {
          sku: "GPX2-BLK",
          price: "17999",
          stock: 16,
          options: { Color: "Black" },
        },
        {
          sku: "GPX2-WHT",
          price: "17999",
          stock: 11,
          options: { Color: "White" },
        },
      ],
    },

    // ============================================================
    // MONITORS
    // ============================================================

    {
      name: "LG UltraGear 27 OLED",
      slug: "lg-ultragear-27-oled",
      baseImage: "https://picsum.photos/seed/lg-ultragear-27-oled/400/400",
      category: "monitors",
      description:
        "27-inch OLED gaming monitor with high refresh rate and extremely fast response time.",
      variants: [
        {
          sku: "LG27OLED-240",
          price: "89999",
          stock: 7,
          options: { RefreshRate: "240Hz" },
        },
      ],
    },

    {
      name: "Samsung Odyssey G7 32",
      slug: "samsung-odyssey-g7-32",
      baseImage: "https://picsum.photos/seed/samsung-odyssey-g7-32/400/400",
      category: "monitors",
      description:
        "32-inch curved gaming monitor with high refresh rate and QHD resolution.",
      variants: [
        {
          sku: "G7-32-165",
          price: "64999",
          stock: 8,
          options: { RefreshRate: "165Hz" },
        },
      ],
    },

    {
      name: "Dell UltraSharp U2724D",
      slug: "dell-ultrasharp-u2724d",
      baseImage: "https://picsum.photos/seed/dell-ultrasharp-u2724d/400/400",
      category: "monitors",
      description:
        "Professional 27-inch monitor designed for productivity and accurate visuals.",
      variants: [
        {
          sku: "DELLU2724D",
          price: "59999",
          stock: 10,
          options: { Size: '27"' },
        },
      ],
    },

    {
      name: "LG UltraWide 34",
      slug: "lg-ultrawide-34",
      baseImage: "https://picsum.photos/seed/lg-ultrawide-34/400/400",
      category: "monitors",
      description:
        "34-inch ultrawide monitor suitable for productivity and multitasking.",
      variants: [
        {
          sku: "LG34UW-160",
          price: "69999",
          stock: 6,
          options: { RefreshRate: "160Hz" },
        },
      ],
    },

    {
      name: "ASUS ProArt 27",
      slug: "asus-proart-27",
      baseImage: "https://picsum.photos/seed/asus-proart-27/400/400",
      category: "monitors",
      description:
        "Professional monitor designed for photographers, designers, and content creators.",
      variants: [
        {
          sku: "PA27-4K",
          price: "74999",
          stock: 5,
          options: { Resolution: "4K" },
        },
      ],
    },

    // ============================================================
    // COMPUTER ACCESSORIES
    // ============================================================

    {
      name: "Apple Magic Keyboard",
      slug: "apple-magic-keyboard",
      baseImage: "https://picsum.photos/seed/apple-magic-keyboard/400/400",
      category: "computer-accessories",
      description: "Wireless keyboard designed for Mac and iPad.",
      variants: [
        {
          sku: "MAGICKEY-WHT",
          price: "14999",
          stock: 20,
          options: { Layout: "US", Color: "White" },
        },
      ],
    },

    {
      name: "Logitech MX Keys S",
      slug: "logitech-mx-keys-s",
      baseImage: "https://picsum.photos/seed/logitech-mx-keys-s/400/400",
      category: "computer-accessories",
      description:
        "Premium wireless keyboard designed for productivity and multi-device use.",
      variants: [
        {
          sku: "MXKEYS-BLK",
          price: "14999",
          stock: 18,
          options: { Color: "Black" },
        },
        {
          sku: "MXKEYS-WHT",
          price: "14999",
          stock: 10,
          options: { Color: "White" },
        },
      ],
    },

    {
      name: "Logitech MX Master 4",
      slug: "logitech-mx-master-4",
      baseImage: "https://picsum.photos/seed/logitech-mx-master-4/400/400",
      category: "computer-accessories",
      description:
        "Advanced wireless productivity mouse with precision tracking and customizable controls.",
      variants: [
        {
          sku: "MXM4-BLK",
          price: "16999",
          stock: 20,
          options: { Color: "Black" },
        },
      ],
    },

    {
      name: "Apple Studio Display",
      slug: "apple-studio-display",
      baseImage: "https://picsum.photos/seed/apple-studio-display/400/400",
      category: "computer-accessories",
      description:
        "High-resolution 27-inch display designed for Mac users and creative professionals.",
      variants: [
        {
          sku: "STUDIO-NANO",
          price: "199999",
          stock: 3,
          options: { Glass: "Nano-texture" },
        },
        {
          sku: "STUDIO-STANDARD",
          price: "169999",
          stock: 5,
          options: { Glass: "Standard" },
        },
      ],
    },

    {
      name: "Logitech Brio 4K",
      slug: "logitech-brio-4k",
      baseImage: "https://picsum.photos/seed/logitech-brio-4k/400/400",
      category: "computer-accessories",
      description:
        "4K webcam designed for video calls, streaming, and content creation.",
      variants: [
        {
          sku: "BRIO4K-BLK",
          price: "18999",
          stock: 15,
          options: { Color: "Black" },
        },
      ],
    },

    // ============================================================
    // NETWORKING
    // ============================================================

    {
      name: "TP-Link Archer AX73",
      slug: "tp-link-archer-ax73",
      baseImage: "https://picsum.photos/seed/tp-link-archer-ax73/400/400",
      category: "networking",
      description: "Wi-Fi 6 router designed for high-speed home networking.",
      variants: [
        {
          sku: "AX73",
          price: "17999",
          stock: 15,
          options: { Standard: "Wi-Fi 6" },
        },
      ],
    },

    {
      name: "TP-Link Deco X50",
      slug: "tp-link-deco-x50",
      baseImage: "https://picsum.photos/seed/tp-link-deco-x50/400/400",
      category: "networking",
      description: "Wi-Fi 6 mesh system for whole-home wireless coverage.",
      variants: [
        {
          sku: "DECOX50-2",
          price: "29999",
          stock: 10,
          options: { Pack: "2-Pack" },
        },
        {
          sku: "DECOX50-3",
          price: "39999",
          stock: 7,
          options: { Pack: "3-Pack" },
        },
      ],
    },

    {
      name: "ASUS ROG Rapture GT-BE98",
      slug: "asus-rog-rapture-gt-be98",
      baseImage: "https://picsum.photos/seed/asus-rog-rapture-gt-be98/400/400",
      category: "networking",
      description:
        "High-end Wi-Fi 7 gaming router with advanced wireless performance.",
      variants: [
        {
          sku: "GTBE98",
          price: "79999",
          stock: 4,
          options: { Standard: "Wi-Fi 7" },
        },
      ],
    },

    {
      name: "Netgear Nighthawk AX5400",
      slug: "netgear-nighthawk-ax5400",
      baseImage: "https://picsum.photos/seed/netgear-nighthawk-ax5400/400/400",
      category: "networking",
      description:
        "High-performance Wi-Fi 6 router for homes with multiple connected devices.",
      variants: [
        {
          sku: "NETAX5400",
          price: "24999",
          stock: 9,
          options: { Standard: "Wi-Fi 6" },
        },
      ],
    },

    {
      name: "TP-Link 8-Port Gigabit Switch",
      slug: "tp-link-8-port-gigabit-switch",
      baseImage:
        "https://picsum.photos/seed/tp-link-8-port-gigabit-switch/400/400",
      category: "networking",
      description: "Compact unmanaged gigabit Ethernet switch.",
      variants: [
        {
          sku: "TPLINK-SW8",
          price: "3999",
          stock: 30,
          options: { Ports: "8-Port" },
        },
      ],
    },

    // ============================================================
    // STORAGE
    // ============================================================

    {
      name: "Samsung 990 Pro NVMe SSD",
      slug: "samsung-990-pro-nvme-ssd",
      baseImage: "https://picsum.photos/seed/samsung-990-pro-nvme-ssd/400/400",
      category: "storage",
      description:
        "High-performance PCIe NVMe SSD for gaming, workstations, and desktops.",
      variants: [
        {
          sku: "990PRO-1TB",
          price: "17999",
          stock: 20,
          options: { Capacity: "1TB" },
        },
        {
          sku: "990PRO-2TB",
          price: "29999",
          stock: 12,
          options: { Capacity: "2TB" },
        },
      ],
    },

    {
      name: "WD Black SN850X NVMe SSD",
      slug: "wd-black-sn850x-nvme-ssd",
      baseImage: "https://picsum.photos/seed/wd-black-sn850x-nvme-ssd/400/400",
      category: "storage",
      description:
        "High-speed NVMe SSD optimized for gaming and demanding applications.",
      variants: [
        {
          sku: "SN850X-1TB",
          price: "15999",
          stock: 18,
          options: { Capacity: "1TB" },
        },
        {
          sku: "SN850X-2TB",
          price: "27999",
          stock: 10,
          options: { Capacity: "2TB" },
        },
      ],
    },

    {
      name: "SanDisk Extreme Portable SSD",
      slug: "sandisk-extreme-portable-ssd",
      baseImage:
        "https://picsum.photos/seed/sandisk-extreme-portable-ssd/400/400",
      category: "storage",
      description: "Portable rugged SSD for fast external storage and backups.",
      variants: [
        {
          sku: "SDEXT-1TB",
          price: "16999",
          stock: 14,
          options: { Capacity: "1TB" },
        },
        {
          sku: "SDEXT-2TB",
          price: "27999",
          stock: 8,
          options: { Capacity: "2TB" },
        },
      ],
    },

    {
      name: "Samsung PRO Plus microSD",
      slug: "samsung-pro-plus-microsd",
      baseImage: "https://picsum.photos/seed/samsung-pro-plus-microsd/400/400",
      category: "storage",
      description:
        "High-speed microSD card for cameras, phones, tablets, and gaming devices.",
      variants: [
        {
          sku: "SMPRO-128",
          price: "2499",
          stock: 30,
          options: { Capacity: "128GB" },
        },
        {
          sku: "SMPRO-256",
          price: "3999",
          stock: 25,
          options: { Capacity: "256GB" },
        },
        {
          sku: "SMPRO-512",
          price: "6999",
          stock: 16,
          options: { Capacity: "512GB" },
        },
      ],
    },

    {
      name: "SanDisk Ultra Dual Drive USB-C",
      slug: "sandisk-ultra-dual-drive-usb-c",
      baseImage:
        "https://picsum.photos/seed/sandisk-ultra-dual-drive-usb-c/400/400",
      category: "storage",
      description: "USB flash drive with USB-C and USB-A connectors.",
      variants: [
        {
          sku: "SDDUAL-128",
          price: "2499",
          stock: 35,
          options: { Capacity: "128GB" },
        },
        {
          sku: "SDDUAL-256",
          price: "3999",
          stock: 20,
          options: { Capacity: "256GB" },
        },
      ],
    },

    // ============================================================
    // SMART HOME
    // ============================================================

    {
      name: "Google Nest Hub Max",
      slug: "google-nest-hub-max",
      baseImage: "https://picsum.photos/seed/google-nest-hub-max/400/400",
      category: "smart-home",
      description:
        "Smart display with Google Assistant, media playback, and smart-home controls.",
      variants: [
        {
          sku: "NESTHUBMAX",
          price: "24999",
          stock: 10,
          options: { Color: "Charcoal" },
        },
      ],
    },

    {
      name: "Amazon Echo Show 8",
      slug: "amazon-echo-show-8",
      baseImage: "https://picsum.photos/seed/amazon-echo-show-8/400/400",
      category: "smart-home",
      description:
        "Smart display for entertainment, video calls, and smart-home control.",
      variants: [
        {
          sku: "ECHO8-BLK",
          price: "19999",
          stock: 14,
          options: { Color: "Black" },
        },
      ],
    },

    {
      name: "Google Nest Audio",
      slug: "google-nest-audio",
      baseImage: "https://picsum.photos/seed/google-nest-audio/400/400",
      category: "smart-home",
      description:
        "Smart speaker with Google Assistant and room-filling audio.",
      variants: [
        {
          sku: "NESTAUDIO-GRY",
          price: "14999",
          stock: 17,
          options: { Color: "Gray" },
        },
        {
          sku: "NESTAUDIO-WHT",
          price: "14999",
          stock: 12,
          options: { Color: "White" },
        },
      ],
    },

    {
      name: "Philips Hue Starter Kit",
      slug: "philips-hue-starter-kit",
      baseImage: "https://picsum.photos/seed/philips-hue-starter-kit/400/400",
      category: "smart-home",
      description:
        "Smart lighting starter kit with app-controlled color and brightness.",
      variants: [
        {
          sku: "HUE-STARTER-3",
          price: "19999",
          stock: 9,
          options: { Bulbs: "3 Bulbs" },
        },
      ],
    },

    {
      name: "TP-Link Tapo C225",
      slug: "tp-link-tapo-c225",
      baseImage: "https://picsum.photos/seed/tp-link-tapo-c225/400/400",
      category: "smart-home",
      description:
        "Indoor smart security camera with pan and tilt functionality.",
      variants: [
        {
          sku: "TAPOC225",
          price: "6999",
          stock: 22,
          options: { Resolution: "2K" },
        },
      ],
    },
  ];

  console.log("🌱 Starting database seed...");

  // ------------------------------------------------------------
  // Clean existing catalog
  // ------------------------------------------------------------

  console.log("🧹 Cleaning existing catalog...");

  await db.productSKU.deleteMany();
  await db.productOptionValue.deleteMany();
  await db.productOption.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();

  // ------------------------------------------------------------
  // Create categories
  // ------------------------------------------------------------

  console.log("📂 Creating categories...");

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const created = await db.category.create({
      data: category,
    });

    categoryMap.set(created.slug, created.id);
  }

  // ------------------------------------------------------------
  // Create products
  // ------------------------------------------------------------

  console.log(`📦 Creating ${products.length} products...`);

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);

    if (!categoryId) {
      throw new Error(
        `Category "${product.category}" not found for ${product.name}`
      );
    }

    const createdProduct = await db.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId,
        baseImage: product.baseImage ?? null,
        isPublished: product.published ?? true,
        archivedAt: product.archived ? new Date() : null,
      },
    });

    // ----------------------------------------------------------
    // Collect all options used by this product
    // ----------------------------------------------------------

    const optionValues = new Map<string, Set<string>>();

    for (const variant of product.variants) {
      for (const [optionName, optionValue] of Object.entries(
        variant.options ?? {}
      )) {
        if (!optionValues.has(optionName)) {
          optionValues.set(optionName, new Set());
        }

        optionValues.get(optionName)?.add(optionValue);
      }
    }

    // ----------------------------------------------------------
    // Create ProductOption + ProductOptionValue
    // ----------------------------------------------------------

    const optionValueMap = new Map<string, string>();

    for (const [optionName, values] of optionValues) {
      const option = await db.productOption.create({
        data: {
          productId: createdProduct.id,
          name: optionName,
        },
      });

      for (const value of values) {
        const optionValue = await db.productOptionValue.create({
          data: {
            optionId: option.id,
            value,
          },
        });

        optionValueMap.set(`${optionName}:${value}`, optionValue.id);
      }
    }

    // ----------------------------------------------------------
    // Create SKUs
    // ----------------------------------------------------------

    for (const variant of product.variants) {
      const optionValueIds = Object.entries(variant.options ?? {})
        .map(([name, value]) => optionValueMap.get(`${name}:${value}`))
        .filter((id): id is string => Boolean(id));

      await db.productSKU.create({
        data: {
          productId: createdProduct.id,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,

          optionValues: {
            connect: optionValueIds.map((id) => ({
              id,
            })),
          },
        },
      });
    }
  }

  // ------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------

  const [categoryCount, productCount, optionCount, optionValueCount, skuCount] =
    await Promise.all([
      db.category.count(),
      db.product.count(),
      db.productOption.count(),
      db.productOptionValue.count(),
      db.productSKU.count(),
    ]);

  console.log("");
  console.log("✅ Seed completed!");
  console.log("");
  console.log(`Categories:     ${categoryCount}`);
  console.log(`Products:       ${productCount}`);
  console.log(`Options:        ${optionCount}`);
  console.log(`Option values:  ${optionValueCount}`);
  console.log(`SKUs:           ${skuCount}`);
  return Response.json({ completed: true });
}
